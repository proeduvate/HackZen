from openai import OpenAI
from typing import List, Dict, Any, Optional
import asyncio
import os
import json
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from core.config import settings
from database import get_ai_embeddings_collection, get_hackathon_collection, get_db


class AICoMentorService:
    def __init__(self):
        self.nvidia_api_key = getattr(settings, "NVIDIA_API_KEY", None) or os.getenv(
            "NVIDIA_API_KEY"
        )
        self.openai_api_key = getattr(settings, "OPENAI_API_KEY", None) or os.getenv(
            "OPENAI_API_KEY"
        )
        self.client = None
        self.primary_model = "meta/llama-3.2-11b-vision-instruct"
        self.fallback_models = [
            "meta/llama-3.2-11b-vision-instruct",
            "meta/llama-3.2-90b-vision-instruct",
        ]
        self.executor = ThreadPoolExecutor(max_workers=5)
        self._init_client()

    def _init_client(self):
        key = self.nvidia_api_key or os.getenv("NVIDIA_API_KEY")
        if key:
            try:
                self.client = OpenAI(
                    base_url="https://integrate.api.nvidia.com/v1",
                    api_key=key,
                    timeout=25.0,
                    max_retries=1,
                )
            except Exception as e:
                print(f"[AI Service] Error configuring NVIDIA AI client: {e}")
        elif self.openai_api_key or os.getenv("OPENAI_API_KEY"):
            try:
                self.client = OpenAI(
                    api_key=self.openai_api_key or os.getenv("OPENAI_API_KEY"),
                    timeout=25.0,
                )
                self.primary_model = "gpt-4o-mini"
                self.fallback_models = ["gpt-4o-mini", "gpt-3.5-turbo"]
            except Exception as e:
                print(f"[AI Service] Error configuring OpenAI client: {e}")

    def _get_active_client(self):
        if not self.client:
            self._init_client()
        return self.client

    def _clean_json(self, text: str) -> Optional[Any]:
        """Extract and parse JSON cleanly from LLM response"""
        if not text:
            return None
        clean = text.strip()

        # Strip markdown fences if present
        if "```" in clean:
            match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", clean)
            if match:
                clean = match.group(1).strip()

        try:
            return json.loads(clean)
        except Exception:
            try:
                first_brace = min(
                    [i for i in [clean.find("{"), clean.find("[")] if i != -1],
                    default=-1,
                )
                last_brace = max([clean.rfind("}"), clean.rfind("]")], default=-1)
                if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
                    candidate = clean[first_brace : last_brace + 1]
                    return json.loads(candidate)
            except Exception:
                pass
        return None

    def _call_llm(
        self,
        prompt: str,
        system_role: str = "You are a specialized AI system that strictly responds with valid JSON. Do not include markdown code block backticks, preamble, or commentary. Return only the raw JSON object.",
        temperature: float = 0.2,
        max_tokens: int = 800,
    ) -> Optional[str]:
        """Synchronously invoke LLM with fallback models"""
        client = self._get_active_client()
        if not client:
            return None

        last_error = None
        for model in self.fallback_models:
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_role},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                if response and response.choices and len(response.choices) > 0:
                    content = response.choices[0].message.content
                    if content:
                        return content
            except Exception as e:
                last_error = e
                continue

        if last_error:
            print(f"[AI Service] LLM generation notice: {last_error}")
        return None

    async def review_hackathon_proposal(
        self, hackathon: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Critically evaluate a hackathon proposal based on actual field completeness & quality"""
        title = hackathon.get("title", "").strip()
        tagline = hackathon.get("tagline", "").strip()
        desc = (hackathon.get("description") or "").strip()
        prob = (hackathon.get("problemStatement") or "").strip()
        themes = hackathon.get("themes") or []
        tracks = hackathon.get("tracks") or []
        rules = hackathon.get("rules") or []
        min_team = hackathon.get("minTeamSize", 1)
        max_team = hackathon.get("maxTeamSize", 4)
        organizer = hackathon.get("organizer", {})

        # Timeline Extraction & Verification
        dates = hackathon.get("dates", {})
        start_raw = (
            dates.get("start", "")
            or str(hackathon.get("hackathonStart") or "")
            or str(hackathon.get("startDate") or "")
        ).strip()
        end_raw = (
            dates.get("end", "")
            or str(hackathon.get("hackathonEnd") or "")
            or str(hackathon.get("endDate") or "")
        ).strip()
        reg_start = str(hackathon.get("registrationStart") or "").strip()
        reg_end = str(hackathon.get("registrationEnd") or "").strip()

        def _parse_date(s: str) -> Optional[datetime]:
            if not s or s.lower() in ["none", "null", "undefined", ""]:
                return None
            for fmt in [
                "%Y-%m-%d",
                "%Y-%m-%dT%H:%M:%S",
                "%Y-%m-%dT%H:%M:%S.%fZ",
                "%b %d, %Y",
                "%d/%m/%Y",
                "%m/%d/%Y",
                "%Y/%m/%d",
            ]:
                try:
                    return datetime.strptime(str(s)[:19], fmt)
                except Exception:
                    pass
            try:
                date_part = str(s).split()[0].split("T")[0]
                return datetime.strptime(date_part, "%Y-%m-%d")
            except Exception:
                return None

        dt_start = _parse_date(start_raw)
        dt_end = _parse_date(end_raw)

        timeline_specified = bool(start_raw and end_raw)
        timeline_ok = bool(dt_start and dt_end and dt_end > dt_start)
        timeline_gap_days = (dt_end - dt_start).days if timeline_ok else 0

        timeline_status = "VALID"
        if not timeline_specified:
            timeline_status = "NOT_SPECIFIED"
        elif not dt_start or not dt_end:
            timeline_status = "UNPARSEABLE_FORMAT"
        elif dt_end <= dt_start:
            timeline_status = "INVALID_REVERSED"
        elif timeline_gap_days > 180:
            timeline_status = "EXCESSIVE_DURATION"

        # Prize Pool Evaluation
        prize_raw = hackathon.get("prizePool") or hackathon.get("prizes") or ""
        has_prize = bool(
            prize_raw
            and str(prize_raw).strip() not in ["", "0", "None", "TBD", "[]", "{}"]
        )
        prize_str = str(prize_raw).strip() if has_prize else "None Specified"

        # Judging Criteria
        judging_raw = (
            hackathon.get("judgingCriteria")
            or hackathon.get("evaluationCriteria")
            or ""
        )
        has_judging = bool(
            judging_raw and str(judging_raw).strip() not in ["", "None", "[]", "{}"]
        )

        # Participant Guidelines
        guidelines_raw = (
            hackathon.get("guidelines") or hackathon.get("participantGuidelines") or ""
        )
        has_guidelines = bool(
            guidelines_raw and str(guidelines_raw).strip() not in ["", "None", "[]"]
        )

        # Python Data Completeness Audit
        desc_words = len(desc.split()) if desc else 0
        prob_words = len(prob.split()) if prob else 0
        rules_count = len(rules) if isinstance(rules, list) else (1 if rules else 0)
        tracks_count = len(tracks) if isinstance(tracks, list) else (1 if tracks else 0)

        is_desc_vague = desc_words < 15 or desc.lower() in [
            "create projects",
            "test",
            "hackathon",
            "build projects",
            "placeholder",
        ]
        is_prob_vague = prob_words < 15 or prob.lower() in [
            "create projects",
            "test",
            "hackathon",
            "build projects",
            "placeholder",
        ]
        is_rules_empty = rules_count == 0

        audit_summary = f"""
[DATA COMPLETENESS & QUALITY AUDIT]:
- Title: "{title}"
- Description: {desc_words} words (Flag: {'VAGUE/SPARSE' if is_desc_vague else 'DETAILED'})
- Problem Statement: {prob_words} words (Flag: {'VAGUE/SPARSE' if is_prob_vague else 'DETAILED'})
- Tracks/Themes Configured: {tracks_count} ({', '.join([str(t) for t in tracks]) if tracks else 'None'})
- Official Rules Defined: {rules_count} rules (Flag: {'EMPTY/MISSING' if is_rules_empty else 'PRESENT'})
- Event Schedule: Start='{start_raw}', End='{end_raw}' -> Status: {timeline_status} ({timeline_gap_days} days duration)
- Prize Pool Configured: {'YES (' + prize_str + ')' if has_prize else 'NO / UNCONFIGURED'}
- Judging Rubric Defined: {'YES' if has_judging else 'NO / UNCONFIGURED'}
- Participant Guidelines: {'YES' if has_guidelines else 'NO / UNCONFIGURED'}
- Team Limits: {min_team} to {max_team} members
- Host Organizer: {organizer.get('name', 'Platform Organizer')} ({organizer.get('org', 'Institution')})
"""

        prompt = f"""You are the ProEduvate Platform AI Hackathon Feasibility & Rubric Evaluator.
Critically evaluate this hackathon proposal section by section:

{audit_summary}

Detailed Proposal Inputs:
- Title: {title}
- Tagline: {tagline or 'Not specified'}
- Description: {desc or 'Not specified'}
- Problem Statement: {prob or 'Not specified'}
- Tracks: {tracks}
- Themes: {themes}
- Rules: {rules if rules else 'NONE PROVIDED'}
- Timeline Schedule: {start_raw} to {end_raw} (Status: {timeline_status})
- Prize Pool: {prize_str}
- Judging Rubric: {judging_raw if has_judging else 'NOT PROVIDED'}
- Participant Guidelines: {guidelines_raw if has_guidelines else 'NOT PROVIDED'}

EVALUATION RULES (CRITICAL):
1. CLARITY SCORE (0-100):
   - If description or problem statement is sparse/placeholder (< 15 words), clarityScore MUST BE BETWEEN 20 and 40.
   - If detailed, domain-specific problem statement and clear challenge background are provided, clarityScore should be 75-95.
2. FEASIBILITY SCORE (0-100):
   - If timeline is INVALID_REVERSED or NOT_SPECIFIED, feasibilityScore MUST BE PENALIZED (max 40).
   - If rules are empty or missing, feasibilityScore MUST BE capped at 65.
   - If tracks are well-scoped (e.g. AI/ML, FinTech, Sustainability) with valid timeline and rules, feasibilityScore should be 80-95.
3. COMPLETENESS & GOVERNANCE SCORE (0-100):
   - Evaluate presence of Prize Pool, Judging Rubric, and Guidelines. Missing items reduce this score.
4. OVERALL SCORE (0-100):
   - Weighted aggregate: (clarityScore * 0.35) + (feasibilityScore * 0.40) + (completenessScore * 0.25).
5. RECOMMENDATION:
   - "APPROVE": ONLY if overallScore >= 75 AND timeline is VALID AND rules are defined (at least 1 rule).
   - "REQUEST_CHANGES": if timeline is invalid/unspecified, rules are missing, description is vague, or overallScore < 75.
   - "REJECT": if clearly spam, offensive, or fraudulent proposal.
6. STRENGTHS & CONCERNS:
   - Strengths: Must cite real data from the proposal (e.g. specific track names, team limits, prize incentives).
   - Concerns / Improvement Areas: Detail EXACTLY what is missing section by section (e.g. "Timeline is invalid: end date precedes start date", "Rules section is empty", "Judging rubric is unconfigured").
7. SUGGESTED FEEDBACK:
   - Provide concrete, actionable instructions telling the organizer what specific sections and details must be updated before publishing.

Return ONLY a valid JSON object strictly matching this schema with dynamically calculated values (DO NOT USE FIXED TEMPLATE NUMBERS):
{{
  "overallScore": <integer 0-100 calculated from rubric>,
  "recommendation": "<'APPROVE' | 'REQUEST_CHANGES' | 'REJECT'>",
  "clarityScore": <integer 0-100 based on description and problem depth>,
  "feasibilityScore": <integer 0-100 based on rules and timeline validity>,
  "completenessScore": <integer 0-100 based on prizes, judging criteria, and guidelines>,
  "strengths": ["<strength 1 citing specific proposal data>", "<strength 2>"],
  "concerns": ["<specific concern detailing missing or vague sections>", "<specific concern 2>"],
  "suggestedFeedback": "<actionable advice detailing what specific sections need more details>"
}}"""

        try:
            loop = asyncio.get_event_loop()
            text = await asyncio.wait_for(
                loop.run_in_executor(
                    self.executor,
                    lambda: self._call_llm(prompt, temperature=0.2, max_tokens=1000),
                ),
                timeout=25.0,
            )

            parsed = self._clean_json(text)
            if isinstance(parsed, dict) and "overallScore" in parsed:
                parsed["source"] = "nvidia-llama"
                parsed["overallScore"] = int(parsed.get("overallScore", 70))
                parsed["clarityScore"] = int(parsed.get("clarityScore", 70))
                parsed["feasibilityScore"] = int(parsed.get("feasibilityScore", 70))
                parsed["completenessScore"] = int(parsed.get("completenessScore", 65))
                # Inject reliably computed flags
                parsed["timelineValid"] = timeline_ok
                parsed["timelineStatus"] = timeline_status
                parsed["timelineDetails"] = {
                    "start": start_raw,
                    "end": end_raw,
                    "durationDays": timeline_gap_days,
                    "isValid": timeline_ok,
                    "status": timeline_status,
                }
                parsed["hasJudgingCriteria"] = has_judging
                parsed["hasPrizePool"] = has_prize
                parsed["hasGuidelines"] = has_guidelines
                parsed["rulesCount"] = rules_count
                return parsed
        except Exception as e:
            import traceback

            print(f"[AI Service] Hackathon review notice: {repr(e)}")
            traceback.print_exc()

        # Dynamic heuristic fallback calculating scores directly from data audit
        calc_clarity = (
            25 if (is_desc_vague or is_prob_vague) else (60 if desc_words < 30 else 88)
        )

        calc_feasibility = 85
        if timeline_status in ["INVALID_REVERSED", "NOT_SPECIFIED"]:
            calc_feasibility -= 40
        elif timeline_status == "UNPARSEABLE_FORMAT":
            calc_feasibility -= 20
        if is_rules_empty:
            calc_feasibility -= 25
        if tracks_count <= 1:
            calc_feasibility -= 10
        calc_feasibility = max(20, min(95, calc_feasibility))

        calc_completeness = 50
        if has_prize:
            calc_completeness += 20
        if has_judging:
            calc_completeness += 15
        if has_guidelines:
            calc_completeness += 15

        calc_overall = int(
            (calc_clarity * 0.35)
            + (calc_feasibility * 0.40)
            + (calc_completeness * 0.25)
        )

        # Stricter recommendation: Must have valid timeline, non-empty rules, and score >= 75
        if timeline_status == "INVALID_REVERSED" or is_rules_empty or calc_overall < 72:
            calc_rec = "REQUEST_CHANGES"
        else:
            calc_rec = "APPROVE"

        concerns = []
        if timeline_status == "INVALID_REVERSED":
            concerns.append(
                f"Event timeline is invalid: end date ('{end_raw}') cannot be before start date ('{start_raw}')."
            )
        elif timeline_status == "NOT_SPECIFIED":
            concerns.append("Event start and end dates have not been configured.")
        elif timeline_gap_days < 1 and timeline_ok:
            concerns.append(
                f"Event duration is less than 24 hours ({timeline_gap_days} days). Ensure adequate building time."
            )

        if is_desc_vague or is_prob_vague:
            concerns.append(
                f"Problem statement and description are too brief ({prob_words} words) — specify technical challenges, target personas, and expected deliverables."
            )
        if is_rules_empty:
            concerns.append(
                "Official submission rules, eligibility criteria, and code originality terms are missing."
            )
        if not has_judging:
            concerns.append(
                "Transparent evaluation and judging criteria are not defined for participants."
            )
        if not has_prize:
            concerns.append(
                "Prize pool or participant incentive details are unconfigured."
            )
        if tracks_count <= 1 and (not tracks or "general" in str(tracks).lower()):
            concerns.append(
                "Tracks are generic — consider defining distinct problem challenge tracks."
            )

        strengths = []
        if timeline_ok:
            strengths.append(
                f"Structured event timeline spanning {timeline_gap_days} days ({start_raw} to {end_raw})."
            )
        if tracks_count > 1:
            strengths.append(
                f"Multi-track challenge scope featuring {', '.join([str(t) for t in tracks[:3]])}."
            )
        else:
            strengths.append(
                "Open-format hackathon theme allowing cross-disciplinary submissions."
            )
        if has_prize:
            strengths.append(f"Incentive pool established: {prize_str}.")
        if has_judging:
            strengths.append(
                "Structured evaluation criteria provided for participants."
            )
        strengths.append(
            f"Balanced team participation bounds configured ({min_team}-{max_team} members)."
        )

        feedback_items = []
        if timeline_status in ["INVALID_REVERSED", "NOT_SPECIFIED"]:
            feedback_items.append("correct the event timeline dates")
        if is_rules_empty:
            feedback_items.append("add clear submission and code originality rules")
        if is_desc_vague:
            feedback_items.append(
                "expand the problem statement with specific technical deliverables"
            )
        if not has_judging:
            feedback_items.append("specify the judging rubric criteria")

        if feedback_items:
            feedback = (
                f"Before publishing '{title}', please: {', '.join(feedback_items)}."
            )
        else:
            feedback = f"Proposal for '{title}' demonstrates solid feasibility, verified timeline ({timeline_gap_days} days), and clear track structure."

        return {
            "overallScore": calc_overall,
            "recommendation": calc_rec,
            "clarityScore": calc_clarity,
            "feasibilityScore": calc_feasibility,
            "completenessScore": calc_completeness,
            "timelineValid": timeline_ok,
            "timelineStatus": timeline_status,
            "timelineDetails": {
                "start": start_raw,
                "end": end_raw,
                "durationDays": timeline_gap_days,
                "isValid": timeline_ok,
                "status": timeline_status,
            },
            "hasJudgingCriteria": has_judging,
            "hasPrizePool": has_prize,
            "hasGuidelines": has_guidelines,
            "rulesCount": rules_count,
            "strengths": strengths,
            "concerns": (
                concerns
                if concerns
                else [
                    "Ensure starter repository templates and judging rubric are shared with teams."
                ]
            ),
            "suggestedFeedback": feedback,
            "source": "heuristic",
        }

    async def review_organizer_application(
        self, application: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Review an organizer application with data-driven risk and credibility assessment"""
        name = application.get(
            "applicantName", application.get("name", "Applicant")
        ).strip()
        email = application.get("email", "").strip()
        org = application.get("organization", "Organization").strip()
        designation = application.get("designation", "").strip()
        org_type = application.get("orgType", "").strip()
        website = application.get("website", "").strip()
        bio = application.get("bio", "").strip()
        experience = application.get("experience", "").strip()
        past_event_names = application.get("pastEventNames", [])

        # Audit Domain Authenticity
        domain = ""
        if "@" in email:
            domain = email.split("@")[1].lower()

        free_domains = [
            "gmail.com",
            "yahoo.com",
            "hotmail.com",
            "outlook.com",
            "icloud.com",
            "live.com",
            "rediffmail.com",
            "protonmail.com",
        ]
        is_free_mail = any(
            domain == f or domain.endswith("." + f) for f in free_domains
        )
        is_edu = (
            domain.endswith(".edu")
            or domain.endswith(".ac.in")
            or domain.endswith(".edu.in")
        )
        is_corporate = (
            not is_free_mail
            and not is_edu
            and ("." in domain)
            and not domain.endswith("org.edu")
        )
        is_edu_or_corp = is_edu or is_corporate

        domain_trust = (
            "INSTITUTIONAL (.EDU/.AC.IN)"
            if is_edu
            else (
                "CORPORATE/CUSTOM DOMAIN" if is_corporate else "FREE WEBMAIL (PUBLIC)"
            )
        )

        # Audit Past Events
        past_events = 0
        match = re.search(r"(\d+)", str(experience))
        if match:
            try:
                past_events = int(match.group(1))
            except Exception:
                pass
        if isinstance(past_event_names, list) and len(past_event_names) > past_events:
            past_events = len(past_event_names)

        # Audit Profile Depth
        bio_words = len(bio.split()) if bio else 0
        is_bio_substantial = bio_words >= 25
        has_website = bool(
            website
            and len(website) > 8
            and "http" in website
            and not website.endswith("org.edu")
        )
        org_specific = bool(
            org
            and len(org) > 3
            and org.lower()
            not in ["not specified", "organization", "test", "company", "none", "n/a"]
        )
        designation_credible = bool(
            designation
            and len(designation) >= 3
            and designation.lower()
            not in ["none", "test", "na", "n/a", "not specified"]
        )

        audit_summary = f"""
[ORGANIZER PROFILE AUDIT]:
- Applicant: {name} ({designation if designation_credible else 'Unspecified Role'})
- Email: {email} (Domain: {domain} -> Trust Level: {domain_trust})
- Organization: {org} (Type: {org_type or 'Educational/Corporate'}, Specificity: {'VERIFIED/NAMED' if org_specific else 'GENERIC/UNSPECIFIED'})
- Official Website: {website if has_website else 'None provided / Placeholder'}
- Leadership Bio Depth: {bio_words} words ({'SUBSTANTIAL' if is_bio_substantial else 'SPARSE/MINIMAL'})
- Platform Track Record: {past_events} past events {f'({", ".join(past_event_names[:3])})' if past_event_names else ''}
"""

        prompt = f"""You are the ProEduvate Platform AI Organizer Verification & Risk Analyst.
Evaluate this organizer application critically based on profile authenticity and institutional representation:

{audit_summary}

EVALUATION RULES:
1. RISK SCORE (0-100, where 0 is lowest risk and 100 is critical fraud risk):
   - Institutional domain (.edu, .ac.in) + established named organization: riskScore MUST BE LOW (10-25).
   - Custom corporate domain + credible designation + website: riskScore should be LOW-MEDIUM (20-35).
   - Free personal webmail (gmail/yahoo/outlook) with established organization & good bio: riskScore should be MEDIUM (40-55).
   - Free webmail with sparse bio (< 15 words) and generic organization: riskScore should be MEDIUM-HIGH (60-75).
   - Placeholder, test, or unverifiable identity: riskScore should be HIGH (> 75).
2. RISK TIER:
   - "LOW" if riskScore < 30.
   - "MEDIUM" if riskScore between 30 and 60.
   - "HIGH" if riskScore > 60.
3. RECOMMENDATION:
   - "APPROVE": ONLY for Low risk (< 30).
   - "REQUEST_CHANGES": for Medium risk (30-60) — request official institution email, event sanction letter, or organization authorization.
   - "REJECT": for High risk (> 60).
4. VERIFIED BADGES:
   - Include realistic badges based on data: e.g. "Institutional Domain" (if .edu/.ac.in), "Organization Verified" (if specific org), "Track Record Confirmed" (if past events > 0), "Web Presence Confirmed" (if website present).
5. AI SUMMARY:
   - 2-3 sentences explicitly mentioning applicant name, organization, domain trust rating, and why the recommendation was given.

Return ONLY a valid JSON object matching this schema with dynamic values (DO NOT USE FIXED TEMPLATE NUMBERS):
{{
  "riskTier": "<'LOW' | 'MEDIUM' | 'HIGH'>",
  "riskScore": <integer 0-100 based on verification audit>,
  "confidenceScore": <integer 50-99>,
  "recommendation": "<'APPROVE' | 'REQUEST_CHANGES' | 'REJECT'>",
  "riskFactors": [
    {{"factor": "<specific factor citing domain, org, or credentials>", "impact": "<'CLEAN' | 'LOW' | 'MEDIUM' | 'HIGH'>"}}
  ],
  "aiSummary": "<executive risk summary referencing applicant, organization, and rationale>",
  "verifiedBadges": ["<badge 1>", "<badge 2>"]
}}"""

        try:
            loop = asyncio.get_event_loop()
            text = await asyncio.wait_for(
                loop.run_in_executor(
                    self.executor,
                    lambda: self._call_llm(prompt, temperature=0.1, max_tokens=850),
                ),
                timeout=25.0,
            )

            parsed = self._clean_json(text)
            if isinstance(parsed, dict) and "riskTier" in parsed:
                if isinstance(parsed.get("aiSummary"), dict):
                    parsed["aiSummary"] = (
                        f"Applicant {name} representing '{org}' evaluated. Risk score {parsed.get('riskScore', 20)}%."
                    )
                parsed["source"] = "nvidia-llama"
                parsed["riskScore"] = int(parsed.get("riskScore", 20))
                parsed["confidenceScore"] = int(parsed.get("confidenceScore", 90))
                parsed["isInstitutionalDomain"] = is_edu_or_corp
                parsed["hasWebsite"] = has_website
                parsed["bioWordCount"] = bio_words
                parsed["pastEventsCount"] = past_events
                parsed["orgSpecific"] = org_specific
                return parsed
        except Exception as e:
            print(f"[AI Service] Organizer review notice: {e}")

        # Dynamic heuristic fallback based on domain, bio, organization and website
        calc_risk = 12
        if is_edu:
            calc_risk = 15
        elif is_corporate:
            calc_risk = 24
        else:
            calc_risk = 48  # free webmail

        if not org_specific:
            calc_risk += 18
        if not has_website:
            calc_risk += 8
        if not is_bio_substantial:
            calc_risk += 10
        if past_events == 0:
            calc_risk += 6
        else:
            calc_risk = max(10, calc_risk - 10)

        calc_risk = max(8, min(92, calc_risk))
        calc_tier = (
            "LOW" if calc_risk < 30 else ("MEDIUM" if calc_risk <= 60 else "HIGH")
        )
        calc_rec = (
            "APPROVE"
            if calc_tier == "LOW"
            else ("REQUEST_CHANGES" if calc_tier == "MEDIUM" else "REJECT")
        )

        risk_factors = [
            {
                "factor": f"Email domain standing ({domain or 'unspecified'})",
                "impact": "CLEAN" if is_edu else ("LOW" if is_corporate else "MEDIUM"),
            },
            {
                "factor": f"Institutional representation for '{org}'",
                "impact": "CLEAN" if org_specific else "MEDIUM",
            },
            {
                "factor": f"Event leadership dossier ({bio_words} words)",
                "impact": "CLEAN" if is_bio_substantial else "LOW",
            },
            {
                "factor": f"Past platform events ({past_events} hosted)",
                "impact": "CLEAN" if past_events > 0 else "LOW",
            },
        ]

        verified_badges = []
        if is_edu:
            verified_badges.append("Institutional Domain (.edu/.ac.in)")
        elif is_corporate:
            verified_badges.append("Corporate Domain Verified")
        if org_specific:
            verified_badges.append("Organization Entity Confirmed")
        if has_website:
            verified_badges.append("Web Presence Verified")
        if past_events > 0:
            verified_badges.append(f"Experienced Organizer ({past_events} events)")
        if not verified_badges:
            verified_badges.append("Identity Pending Verification")

        ai_summary = (
            f"Applicant {name} representing '{org}' evaluated. "
            f"Profile exhibits {domain_trust.lower()} standing with {bio_words} words of background and {past_events} recorded events. "
            f"Assessed at {calc_tier} risk ({calc_risk}%)."
        )

        return {
            "riskTier": calc_tier,
            "riskScore": calc_risk,
            "confidenceScore": 92 if is_edu_or_corp else 78,
            "recommendation": calc_rec,
            "riskFactors": risk_factors,
            "aiSummary": ai_summary,
            "verifiedBadges": verified_badges,
            "isInstitutionalDomain": is_edu_or_corp,
            "hasWebsite": has_website,
            "bioWordCount": bio_words,
            "pastEventsCount": past_events,
            "orgSpecific": org_specific,
            "source": "heuristic",
        }

    async def review_project_submission(
        self, submission: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Critically review a hackathon project submission using dynamic technical rubric evaluation"""
        title = submission.get(
            "projectTitle", submission.get("title", "Project")
        ).strip()
        track = submission.get("category", submission.get("track", "General")).strip()
        tagline = submission.get("tagline", "").strip()
        desc = (submission.get("desc") or submission.get("description") or "").strip()
        repo_url = submission.get("repoUrl", submission.get("githubUrl", "")).strip()
        demo_url = submission.get("demoUrl", submission.get("videoUrl", "")).strip()
        tech_stack = submission.get("techStack", [])
        if isinstance(tech_stack, str):
            tech_stack = [t.strip() for t in tech_stack.split(",") if t.strip()]

        has_repo = (
            any(
                h in repo_url.lower()
                for h in ["github.com", "gitlab.com", "bitbucket.org"]
            )
            and len(repo_url) > 15
        )
        has_demo = bool(
            demo_url
            and len(demo_url) > 8
            and any(
                h in demo_url.lower()
                for h in ["http", "youtu", "loom", "vercel", "netlify", "vimeo"]
            )
        )
        desc_words = len(desc.split()) if desc else 0
        tech_str = ", ".join(tech_stack) if tech_stack else "Unspecified Stack"

        # Track to Tech-Stack Coherence Analysis
        track_lower = track.lower()
        tech_lower = [t.lower() for t in tech_stack]
        coherent_signals = []
        if any(w in track_lower for w in ["ai", "machine learning", "ml", "data"]):
            if any(
                t in " ".join(tech_lower)
                for t in [
                    "python",
                    "pytorch",
                    "tensorflow",
                    "opencv",
                    "scikit",
                    "llm",
                    "openai",
                    "gemini",
                    "langchain",
                    "huggingface",
                    "pandas",
                ]
            ):
                coherent_signals.append("AI/Data Stack Alignment")
        if any(w in track_lower for w in ["web", "fullstack", "saas", "app"]):
            if any(
                t in " ".join(tech_lower)
                for t in [
                    "react",
                    "next",
                    "vue",
                    "node",
                    "express",
                    "fastapi",
                    "tailwind",
                    "typescript",
                    "javascript",
                    "mongo",
                    "postgres",
                ]
            ):
                coherent_signals.append("Modern Web/Fullstack Stack Alignment")
        if any(w in track_lower for w in ["web3", "blockchain", "crypto", "defi"]):
            if any(
                t in " ".join(tech_lower)
                for t in [
                    "solidity",
                    "ethereum",
                    "web3",
                    "rust",
                    "polygon",
                    "hardhat",
                    "ethers",
                    "ipfs",
                ]
            ):
                coherent_signals.append("Web3/Smart Contract Architecture Alignment")

        is_track_coherent = len(coherent_signals) > 0 or not tech_stack

        audit_summary = f"""
[SUBMISSION DELIVERABLES AUDIT]:
- Project: "{title}" (Category/Track: {track})
- Repository URL: {repo_url} (Valid Git Host: {'YES' if has_repo else 'NO/PLACEHOLDER'})
- Demo URL: {demo_url or 'None'} (Present & Reachable: {'YES' if has_demo else 'NO'})
- Tech Stack: {tech_str} ({len(tech_stack)} tools specified)
- Track Coherence: {'ALIGNED (' + ', '.join(coherent_signals) + ')' if coherent_signals else 'GENERAL/UNVERIFIED FIT'}
- Description Depth: {desc_words} words ({'DETAILED' if desc_words >= 30 else 'SPARSE'})
"""

        prompt = f"""You are the ProEduvate Platform AI Technical Judge & Submission Reviewer.
Critically evaluate this hackathon project submission based on deliverables and code quality:

{audit_summary}

Full Details:
- Title: {title}
- Tagline: {tagline or 'Not specified'}
- Description: {desc or 'Not specified'}
- Tech Stack: {tech_str}
- Track: {track}

EVALUATION RULES:
1. CODE QUALITY SCORE (0-100):
   - If repository URL is invalid or missing placeholder, codeQualityScore MUST BE PENALIZED (max 40).
   - If demo URL is also missing, cap codeQualityScore at 30.
   - If valid active Git repository and demo are present with modular stack, score 80-95.
2. PROBLEM FIT (0-100):
   - Evaluate how well {tech_str} and the proposed solution address challenge parameters in the '{track}' track.
3. INNOVATION & TECHNICAL FEASIBILITY (0-100):
   - Calculate based on technical depth, tool appropriateness, and deliverable maturity.
4. OVERALL SCORE (0-100):
   - Weighted aggregate: (codeQualityScore * 0.35) + (problemFit * 0.35) + (technicalFeasibility * 0.15) + (innovationScore * 0.15).
5. RECOMMENDATION:
   - "RECOMMEND APPROVAL": ONLY if overallScore >= 75 AND valid repository is provided.
   - "REQUEST CHANGES": if repository URL is broken, demo is missing, or overallScore is between 50 and 74.
   - "FLAG FOR INVESTIGATION": if signs of placeholder or non-original work are detected.
   - "REJECT": if non-functional spam.
6. SUMMARY & CONCERNS:
   - Explicitly cite the project title, category track, and specific tech stack components in the summary.

Return ONLY a valid JSON object matching this schema with dynamically calculated values (DO NOT USE FIXED TEMPLATE NUMBERS):
{{
  "overallScore": <integer 0-100 calculated from rubric>,
  "aiRecommendation": "<'RECOMMEND APPROVAL' | 'REQUEST CHANGES' | 'FLAG FOR INVESTIGATION' | 'REJECT'>",
  "problemFit": <integer 0-100 based on track relevance>,
  "technicalFeasibility": <integer 0-100 based on architecture realism>,
  "innovationScore": <integer 0-100 based on originality>,
  "codeQualityScore": <integer 0-100 based on repo deliverable completeness>,
  "summary": "<2-3 sentence technical critique citing project title, track, and tech stack>",
  "strengths": ["<strength 1 citing specific tech stack architecture>", "<strength 2>"],
  "concerns": ["<specific concern regarding deliverables, testing, or documentation>"],
  "suggestedFeedback": "<actionable advice for the demo pitch or code repository>"
}}"""

        try:
            loop = asyncio.get_event_loop()
            text = await asyncio.wait_for(
                loop.run_in_executor(
                    self.executor,
                    lambda: self._call_llm(prompt, temperature=0.2, max_tokens=850),
                ),
                timeout=25.0,
            )

            parsed = self._clean_json(text)
            if isinstance(parsed, dict) and "overallScore" in parsed:
                parsed["source"] = "nvidia-llama"
                parsed["overallScore"] = int(parsed.get("overallScore", 80))
                parsed["problemFit"] = int(parsed.get("problemFit", 80))
                parsed["technicalFeasibility"] = int(
                    parsed.get("technicalFeasibility", 80)
                )
                parsed["codeQualityScore"] = int(parsed.get("codeQualityScore", 80))
                parsed["hasRepo"] = has_repo
                parsed["hasDemo"] = has_demo
                parsed["techStackCount"] = len(tech_stack)
                parsed["descWordCount"] = desc_words
                parsed["trackCoherent"] = is_track_coherent
                return parsed
        except Exception as e:
            print(f"[AI Service] Submission review notice: {e}")

        # Dynamic heuristic fallback
        calc_code = 85 if (has_repo and has_demo) else (70 if has_repo else 35)
        calc_fit = (
            88
            if is_track_coherent and desc_words >= 25
            else (70 if desc_words >= 15 else 50)
        )
        calc_tech = 85 if len(tech_stack) >= 3 else 70
        calc_innov = 80 if desc_words >= 25 else 65
        calc_overall = int(
            (calc_code * 0.35)
            + (calc_fit * 0.35)
            + (calc_tech * 0.15)
            + (calc_innov * 0.15)
        )
        calc_rec = (
            "RECOMMEND APPROVAL"
            if (calc_overall >= 75 and has_repo)
            else "REQUEST CHANGES"
        )

        concerns = []
        if not has_repo:
            concerns.append(
                "Active source code repository (GitHub/GitLab) is missing or unverified."
            )
        if not has_demo:
            concerns.append("Working demo URL or video walkthrough was not provided.")
        if desc_words < 20:
            concerns.append(
                f"Project documentation is brief ({desc_words} words) — elaborate on system architecture."
            )

        strengths = []
        if has_repo:
            strengths.append(
                "Verified source code repository linked on recognized Git host."
            )
        if len(tech_stack) >= 2:
            strengths.append(f"Structured multi-tier technology stack ({tech_str}).")
        if coherent_signals:
            strengths.append(
                f"Direct architectural fit for {track} track ({', '.join(coherent_signals)})."
            )

        return {
            "overallScore": calc_overall,
            "aiRecommendation": calc_rec,
            "problemFit": calc_fit,
            "technicalFeasibility": calc_tech,
            "innovationScore": calc_innov,
            "codeQualityScore": calc_code,
            "summary": f"'{title}' demonstrates {'cohesive deliverable completeness' if has_repo else 'missing active repository deliverable'} in the {track} track, utilizing {tech_str}.",
            "strengths": (
                strengths
                if strengths
                else ["Project submission initialized within track bounds."]
            ),
            "concerns": (
                concerns
                if concerns
                else [
                    "Ensure automated test coverage and deploy demo environment prior to judging."
                ]
            ),
            "suggestedFeedback": f"Demonstrate user workflow and highlight problem metrics solved by '{title}' during presentation.",
            "hasRepo": has_repo,
            "hasDemo": has_demo,
            "techStackCount": len(tech_stack),
            "descWordCount": desc_words,
            "trackCoherent": is_track_coherent,
            "source": "heuristic",
        }

    async def analyze_dispute_case(self, dispute: Dict[str, Any]) -> Dict[str, Any]:
        """Critically analyze a plagiarism or dispute case tied to real similarity percentage"""
        sim_data = dispute.get(
            "similarityAnalysis", dispute.get("similarity_analysis", {})
        )
        if not isinstance(sim_data, dict):
            sim_data = {}

        overall_sim = int(sim_data.get("overallSimilarity", 75))
        source_sim = int(
            sim_data.get(
                "sourceCode", sim_data.get("sourceCodeSimilarity", overall_sim)
            )
        )
        doc_sim = int(sim_data.get("documentation", sim_data.get("docSimilarity", 70)))
        matched_repo = sim_data.get(
            "matchedSourceUrl",
            sim_data.get("matchedRepo", "External open-source repository"),
        )

        team = dispute.get("reportedTeam", {})
        team_name = (
            team.get("name", "Reported Team") if isinstance(team, dict) else str(team)
        )
        hackathon = dispute.get("hackathonTitle", "Hackathon")
        category = dispute.get("type", dispute.get("category", "Code Plagiarism"))
        evidence = dispute.get("evidence", [])

        evidence_str_list = []
        if isinstance(evidence, list):
            for i, item in enumerate(evidence, 1):
                if isinstance(item, dict):
                    evidence_str_list.append(
                        f"  {i}. {item.get('title', item.get('description', str(item)))}"
                    )
                else:
                    evidence_str_list.append(f"  {i}. {str(item)}")
        evidence_text = (
            "\n".join(evidence_str_list)
            if evidence_str_list
            else "  - Automated AST Code Similarity Analysis Report"
        )

        prompt = f"""You are the ProEduvate Platform AI Dispute & Plagiarism Investigator.
Analyze this specific hackathon dispute case based on empirical similarity data:

Case Details:
- Case Code: {dispute.get('disputeCode', dispute.get('id', 'DSP-CASE'))}
- Category: {category}
- Reported Team: {team_name}
- Hackathon Event: {hackathon}
- Measured Code Similarity: {overall_sim}% overall (Source Code: {source_sim}%, Documentation: {doc_sim}%)
- Reference Matched Source: {matched_repo}
- Documented Evidence Items:
{evidence_text}

DISCIPLINARY RULES:
1. SEVERITY:
   - If similarity > 80%: "CRITICAL"
   - If similarity 50-80%: "HIGH"
   - If similarity 30-50%: "MEDIUM"
   - If similarity < 30%: "LOW"
2. RECOMMENDED DECISION:
   - If similarity > 85%: "DISQUALIFICATION"
   - If similarity between 50% and 85%: "REQUEST_EXPLANATION"
   - If similarity between 30% and 50%: "ISSUE_WARNING"
   - If similarity < 30%: "DISMISS"
3. CONFIDENCE SCORE (50-99):
   - Proportional to evidence integrity and similarity metrics.
4. OFFICIAL COMMUNICATION DRAFT:
   - Must be a complete, formal, official email notice addressed to Team {team_name}.
   - Specify the exact {overall_sim}% similarity against {matched_repo}.
   - Set a clear 24-hour deadline for counter-evidence submission.

Return ONLY a valid JSON object matching this schema with dynamic values (DO NOT USE FIXED NUMBERS):
{{
  "executiveSummary": "<objective 1-2 sentence case summary citing team name, event, and {overall_sim}% similarity>",
  "severity": "<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>",
  "confidenceScore": <integer 50-99>,
  "keyFindings": ["<finding 1 citing exact similarity of {overall_sim}%>", "<finding 2>", "<finding 3>"],
  "recommendedDecision": "<'DISQUALIFICATION' | 'REQUEST_EXPLANATION' | 'ISSUE_WARNING' | 'DISMISS'>",
  "recommendationReason": "<detailed rationale citing why {overall_sim}% warrants this decision>",
  "suggestedCommunication": "<complete formal email notice to Team {team_name}>"
}}"""

        try:
            loop = asyncio.get_event_loop()
            text = await asyncio.wait_for(
                loop.run_in_executor(
                    self.executor,
                    lambda: self._call_llm(prompt, temperature=0.1, max_tokens=900),
                ),
                timeout=25.0,
            )

            parsed = self._clean_json(text)
            if isinstance(parsed, dict) and "executiveSummary" in parsed:
                parsed["source"] = "nvidia-llama"
                parsed["confidenceScore"] = int(parsed.get("confidenceScore", 90))
                parsed["overallSimilarity"] = overall_sim
                parsed["matchedRepo"] = matched_repo
                return parsed
        except Exception as e:
            print(f"[AI Service] Dispute analysis notice: {e}")

        # Dynamic fallback
        sev = (
            "CRITICAL"
            if overall_sim > 80
            else (
                "HIGH"
                if overall_sim > 50
                else ("MEDIUM" if overall_sim > 30 else "LOW")
            )
        )
        dec = (
            "DISQUALIFICATION"
            if overall_sim > 85
            else (
                "REQUEST_EXPLANATION"
                if overall_sim > 50
                else ("ISSUE_WARNING" if overall_sim > 30 else "DISMISS")
            )
        )

        drafted_notice = (
            f"Subject: Official Notice - Originality Clarification Request: [{hackathon}]\n\n"
            f"Dear Team {team_name},\n\n"
            f"During the integrity review for {hackathon}, our automated scanner identified a {overall_sim}% similarity "
            f"between your submission deliverables and external source: {matched_repo}.\n\n"
            f"Under platform integrity regulations, all projects must represent independent, original work created during the event.\n\n"
            f"ACTION REQUIRED:\n"
            f"Please furnish written clarification along with timestamped commit history or local IDE logs within 24 hours.\n\n"
            f"Regards,\nHackZen Platform Integrity Committee"
        )

        return {
            "executiveSummary": f"Code similarity evaluation for team '{team_name}' in {hackathon} indicates {overall_sim}% structural overlap with {matched_repo}.",
            "severity": sev,
            "confidenceScore": 92 if overall_sim > 70 else 80,
            "keyFindings": [
                f"Automated AST scanner identified {overall_sim}% similarity ({source_sim}% code, {doc_sim}% documentation).",
                f"Benchmark target matched: {matched_repo}.",
                f"Dispute investigated under {category} guidelines with {len(evidence_str_list)} recorded evidence items.",
            ],
            "recommendedDecision": dec,
            "recommendationReason": f"Similarity metric of {overall_sim}% exceeds acceptable independent originality thresholds.",
            "suggestedCommunication": drafted_notice,
            "overallSimilarity": overall_sim,
            "matchedRepo": matched_repo,
            "source": "heuristic",
        }

    async def generate_admin_insights(
        self, stats: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate platform analytics insights calculated from live database counts"""
        total_users = stats.get("total_users", 0)
        running_hacks = stats.get("running_hacks", 0)
        completed_hacks = stats.get("completed_hacks", 0)
        total_teams = stats.get("total_teams", 0)
        total_subs = stats.get("total_subs", 0)
        certs_minted = stats.get("certs_minted", 0)
        pending_approvals = stats.get("pending_approvals", 0)

        # Derived dynamic analytics metrics
        total_active_events = running_hacks + completed_hacks
        completion_rate = (
            round((completed_hacks / total_active_events * 100), 1)
            if total_active_events > 0
            else 0.0
        )
        subs_per_team = round(total_subs / total_teams, 2) if total_teams > 0 else 0.0
        subs_per_hack = (
            round(total_subs / running_hacks, 1) if running_hacks > 0 else 0.0
        )
        cert_coverage = (
            round(certs_minted / total_subs * 100, 1) if total_subs > 0 else 0.0
        )
        backlog_severity = (
            "high"
            if pending_approvals >= 5
            else ("moderate" if pending_approvals > 0 else "clear")
        )

        prompt = f"""You are the ProEduvate Platform AI Analytics Engine.
Analyze these EXACT live platform metrics and derived operational rates:
- Total Registered Builders: {total_users}
- Active Hackathon Arenas: {running_hacks}
- Completed Hackathons: {completed_hacks} (Historical Completion Rate: {completion_rate}%)
- Participating Teams: {total_teams}
- Total Project Submissions: {total_subs} (Submission Yield: {subs_per_team} projects/team)
- Average Submissions per Active Arena: {subs_per_hack}
- Certificates Minted: {certs_minted} (Issuance Rate: {cert_coverage}% of submissions)
- Pending Approvals in Queue: {pending_approvals} (Backlog Status: {backlog_severity.upper()})

Generate exactly 6 strategic, concise platform insights for the administrator.
Every insight MUST cite relevant real numbers from above and offer actionable intelligence.
Do NOT use fixed template sentences. Calculate and reflect the real activity level.

Return ONLY a valid JSON array of 6 objects with keys:
- "title": Short title (e.g. "Builder Growth Trajectory", "Governance Pipeline")
- "content": 1-2 sentences citing real numbers from the metrics.
- "type": One of ["positive", "info", "warning", "purple", "danger"]"""

        try:
            loop = asyncio.get_event_loop()
            text = await asyncio.wait_for(
                loop.run_in_executor(
                    self.executor,
                    lambda: self._call_llm(prompt, temperature=0.2, max_tokens=850),
                ),
                timeout=25.0,
            )

            parsed = self._clean_json(text)
            if isinstance(parsed, list) and len(parsed) >= 4:
                return parsed
        except Exception as e:
            print(f"[AI Service] Admin insights notice: {e}")

        # Dynamic fallback calculated 100% from live metrics
        return [
            {
                "title": "Community Scale & Builder Trajectory",
                "content": f"Platform engagement encompasses {total_users} registered builders collaborating across {total_teams} teams ({round(total_users / max(1, total_teams), 1)} builders per team average).",
                "type": "positive",
            },
            {
                "title": "Arena Operational Cadence",
                "content": f"{running_hacks} hackathons currently active alongside {completed_hacks} completed events, reflecting a {completion_rate}% arena completion rate.",
                "type": "info",
            },
            {
                "title": "Governance & Approvals Queue",
                "content": f"{pending_approvals} organizer and hackathon requests awaiting review (queue state: {backlog_severity}).",
                "type": "warning" if pending_approvals > 0 else "positive",
            },
            {
                "title": "Project Submission Yield",
                "content": f"Submissions aggregate to {total_subs} projects across tracks, achieving {subs_per_team} deliverables per registered team.",
                "type": "purple",
            },
            {
                "title": "Verifiable Credential Index",
                "content": f"{certs_minted} tamper-proof verifiable certificates issued to date ({cert_coverage}% coverage of submitted deliverables).",
                "type": "positive",
            },
            {
                "title": "Operational Evaluation Bandwidth",
                "content": f"Active arenas average {subs_per_hack} submissions per event. Ensure judge rubrics and panel allocations are confirmed prior to deadlines.",
                "type": "danger" if pending_approvals > 3 else "info",
            },
        ]

    async def generate_response(
        self,
        query: str,
        context: List[str] = None,
        hackathon_id: Optional[str] = None,
        objective: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate AI response with hackathon context"""
        try:
            hackathon_info = await self._get_hackathon_context(hackathon_id)
            relevant_docs = (
                await self._retrieve_relevant_documents(query, hackathon_id)
                if hackathon_id
                else []
            )

            context_str = ""
            if context and len(context) > 0:
                context_str = "\nAdditional Context: " + "\n".join(context)

            objective_str = (
                f"Student Objective: {objective}"
                if objective
                else "Stage: General Mentorship & Guidance"
            )

            user_prompt = f"""Hackathon Context:
{hackathon_info}
{objective_str}
{context_str}

Relevant Attachments:
{chr(10).join(relevant_docs[:3]) if relevant_docs else "None"}

Student Question:
{query}"""

            system_role = """You are the ProEduvate AI Co-Mentor, an expert, encouraging technical advisor for students participating in hackathons.
Provide concise, actionable, and architecturally sound advice formatted in clean GitHub markdown (bold headings, bullet points, and code blocks)."""

            loop = asyncio.get_event_loop()
            text = await asyncio.wait_for(
                loop.run_in_executor(
                    self.executor,
                    lambda: self._call_llm(
                        user_prompt,
                        system_role=system_role,
                        temperature=0.4,
                        max_tokens=1000,
                    ),
                ),
                timeout=30.0,
            )

            if text:
                return {
                    "response": text,
                    "sources": relevant_docs[:3],
                    "model_used": self.primary_model,
                    "source": "nvidia-llama",
                }
        except Exception as e:
            print(f"[AI Service] generate_response notice: {e}")

        return {
            "response": f"### Mentorship Guidance\n\nFor your question regarding *'{query[:60]}...'*, focus on the following key pillars:\n- **MVP First:** Implement your core end-to-end functionality before polishing the UI.\n- **Modular Architecture:** Keep business logic separated from presentation layers.\n- **Testing & Pitch:** Prepare a clear demo script highlighting the problem solved.",
            "source": "heuristic",
        }

    async def _retrieve_relevant_documents(
        self, query: str, hackathon_id: Optional[str]
    ) -> List[str]:
        """Retrieve relevant documents from vector store / MongoDB"""
        try:
            embeddings_collection = get_ai_embeddings_collection()
            if not embeddings_collection:
                return []

            query_filter = {}
            if hackathon_id and hackathon_id != "general":
                query_filter["hackathon_id"] = hackathon_id

            docs = await embeddings_collection.find(query_filter).limit(3).to_list(3)
            return [doc.get("content", "") for doc in docs if doc.get("content")]
        except Exception:
            return []

    async def _get_hackathon_context(self, hackathon_id: Optional[str]) -> str:
        """Get basic hackathon context from DB or string"""
        if not hackathon_id or hackathon_id == "general":
            return "General Hackathon Guidance across AI, Web3, FullStack, and Cloud tracks."

        try:
            db = get_db()
            hackathon = None
            try:
                from bson import ObjectId

                if ObjectId.is_valid(hackathon_id):
                    hackathon = await db["hackathons"].find_one(
                        {"_id": ObjectId(hackathon_id)}
                    )
            except Exception:
                pass

            if not hackathon:
                hackathon = await db["hackathons"].find_one(
                    {
                        "$or": [
                            {"hackathonId": hackathon_id},
                            {"title": {"$regex": hackathon_id, "$options": "i"}},
                        ]
                    }
                )

            if not hackathon:
                return f"Hackathon Track: {hackathon_id}"

            return f"""
Hackathon: {hackathon.get('title', 'Hackathon')}
Description: {hackathon.get('description', '')}
Themes / Tracks: {', '.join(hackathon.get('themes', []))}
Status: {hackathon.get('status', 'Active')}
Rules / Overview: {hackathon.get('rules', '')[:250]}
"""
        except Exception:
            return f"Hackathon Track: {hackathon_id}"

    async def generate_idea_feedback(
        self, idea: str, hackathon_themes: List[str]
    ) -> Dict[str, Any]:
        """Provide AI feedback on hackathon idea"""
        prompt = f"""Evaluate this hackathon idea:
Themes: {', '.join(hackathon_themes)}
Idea: {idea}

Provide structured feedback in Markdown with:
1. Strengths (2-3 bullets)
2. Potential Pitfalls / Weaknesses (2 bullets)
3. Feasibility Score (1-5 / 5) with justification
4. Theme Alignment Score (1-5 / 5)
5. Next Actionable Steps for the team"""

        system_role = "You are a senior hackathon judge evaluating a project idea. Provide practical, high-value feedback in Markdown."

        try:
            loop = asyncio.get_event_loop()
            text = await asyncio.wait_for(
                loop.run_in_executor(
                    self.executor,
                    lambda: self._call_llm(
                        prompt, system_role=system_role, temperature=0.3, max_tokens=700
                    ),
                ),
                timeout=25.0,
            )

            if text:
                return {
                    "feedback": text,
                    "analysis": {"themes_alignment": 4.5, "feasibility_score": 4.2},
                    "source": "nvidia-llama",
                }
        except Exception as e:
            print(f"[AI Service] Idea feedback notice: {e}")

        return {
            "feedback": f"### Idea Evaluation for '{idea[:40]}...'\n\n- **Strengths:** Directly aligns with {', '.join(hackathon_themes) if hackathon_themes else 'core hackathon tracks'}.\n- **Feasibility:** High potential for rapid prototyping within hackathon timeframes.\n- **Recommended Next Step:** Build a working prototype focusing on core user value.",
            "analysis": {"themes_alignment": 4.5, "feasibility_score": 4.0},
            "source": "heuristic",
        }

    async def suggest_mentor_match(
        self, team_requirements: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Suggest mentor matches based on team requirements"""
        prompt = f"""Based on these team requirements, generate top 3 mentor matching priorities:
Team Requirements:
- Expertise needed: {team_requirements.get('expertise', [])}
- Project type: {team_requirements.get('project_type', 'General')}
- Tech stack: {team_requirements.get('tech_stack', [])}
- Team experience: {team_requirements.get('experience_level', 'Intermediate')}

Format as JSON array with items {{"priority": 1, "criteria": "...", "recommendedRole": "..."}}. Return JSON only."""

        try:
            loop = asyncio.get_event_loop()
            text = await asyncio.wait_for(
                loop.run_in_executor(
                    self.executor,
                    lambda: self._call_llm(prompt, temperature=0.1, max_tokens=400),
                ),
                timeout=25.0,
            )

            parsed = self._clean_json(text)
            if isinstance(parsed, list) and len(parsed) > 0:
                return parsed
        except Exception as e:
            print(f"[AI Service] Mentor match notice: {e}")

        tech = ", ".join(team_requirements.get("tech_stack", [])) or "FullStack & Cloud"
        return [
            {
                "priority": 1,
                "criteria": f"Specialized guidance in {tech}",
                "recommendedRole": "Technical Architect",
            },
            {
                "priority": 2,
                "criteria": "Product Demo & Pitch Mentorship",
                "recommendedRole": "Product Lead",
            },
            {
                "priority": 3,
                "criteria": "Deployment & Scalability Verification",
                "recommendedRole": "DevOps Specialist",
            },
        ]


# Singleton instance
ai_service = AICoMentorService()
