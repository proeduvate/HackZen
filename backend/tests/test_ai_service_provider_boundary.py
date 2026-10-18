import importlib
import sys
from types import ModuleType
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch


# Importing this legacy service creates its module singleton. Supply a minimal
# SDK stub during import so tests need no SDK installation and cannot initialize
# or call a real provider.
openai_stub = ModuleType("openai")
openai_stub.OpenAI = Mock()
with patch.dict(sys.modules, {"openai": openai_stub}):
    ai_service_module = importlib.import_module("services.ai_service")


def provider_response(content):
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=content))]
    )


class AIServiceProviderBoundaryTests(unittest.IsolatedAsyncioTestCase):
    def make_service(self, client, models=("primary", "fallback")):
        service = object.__new__(ai_service_module.AICoMentorService)
        service.primary_model = models[0]
        service.fallback_models = list(models)
        service._get_active_client = Mock(return_value=client)
        return service

    def make_client(self, *responses):
        create = Mock(side_effect=responses)
        return SimpleNamespace(
            chat=SimpleNamespace(
                completions=SimpleNamespace(create=create)
            )
        )

    def test_provider_valid_response_is_returned(self):
        client = self.make_client(provider_response("  Useful answer  "))
        service = self.make_service(client)

        result = service._call_llm("question")

        self.assertEqual(result, "Useful answer")
        self.assertEqual(client.chat.completions.create.call_args.kwargs["model"], "primary")

    def test_primary_model_failure_uses_next_configured_model(self):
        client = self.make_client(RuntimeError("provider unavailable"), provider_response("Fallback answer"))
        service = self.make_service(client)

        result = service._call_llm("question")

        self.assertEqual(result, "Fallback answer")
        self.assertEqual(
            [call.kwargs["model"] for call in client.chat.completions.create.call_args_list],
            ["primary", "fallback"],
        )

    def test_all_configured_model_attempts_failing_returns_none(self):
        client = self.make_client(RuntimeError("first failure"), RuntimeError("second failure"))
        service = self.make_service(client)

        result = service._call_llm("question")

        self.assertIsNone(result)
        self.assertEqual(client.chat.completions.create.call_count, 2)

    def test_empty_provider_response_returns_none(self):
        client = self.make_client(provider_response(""), provider_response(""))
        service = self.make_service(client)

        result = service._call_llm("question")

        self.assertIsNone(result)
        self.assertEqual(client.chat.completions.create.call_count, 2)

    def test_whitespace_only_provider_response_is_not_usable(self):
        client = self.make_client(provider_response("   "), provider_response("\t"))
        service = self.make_service(client)

        result = service._call_llm("question")

        self.assertIsNone(result)
        self.assertEqual(client.chat.completions.create.call_count, 2)

    async def test_provider_failure_returns_usable_heuristic_response(self):
        client = self.make_client(RuntimeError("provider unavailable"), RuntimeError("provider unavailable"))
        service = self.make_service(client)
        service._get_hackathon_context = AsyncMock(return_value="General context")
        service._get_student_team_context = AsyncMock(return_value="Individual participant")
        service._retrieve_relevant_documents = AsyncMock(return_value=[])

        result = await service.generate_response("How should I start?")

        self.assertEqual(result["source"], "heuristic")
        self.assertTrue(result["response"].strip())
        self.assertIn("MVP First", result["response"])

    async def test_whitespace_provider_responses_reach_heuristic_fallback(self):
        client = self.make_client(provider_response("   "), provider_response("\t"))
        service = self.make_service(client)
        service._get_hackathon_context = AsyncMock(return_value="General context")
        service._get_student_team_context = AsyncMock(return_value="Individual participant")
        service._retrieve_relevant_documents = AsyncMock(return_value=[])

        result = await service.generate_response("How should I start?")

        self.assertEqual(result["source"], "heuristic")
        self.assertTrue(result["response"].strip())
        self.assertEqual(client.chat.completions.create.call_count, 2)


if __name__ == "__main__":
    unittest.main()
