import os
import sys
import unittest
import ast
from pathlib import Path
from types import ModuleType
from unittest.mock import AsyncMock, patch

from startup_seed import seed_portal_data_if_enabled


class StartupSeedingTests(unittest.IsolatedAsyncioTestCase):
    async def test_portal_seeders_are_not_called_when_seeding_is_disabled(self):
        student_seed = AsyncMock()
        organizer_seed = AsyncMock()
        student_module = ModuleType("seed_student_portal_data")
        student_module.seed_student_data_direct = student_seed
        organizer_module = ModuleType("seed_organizer_portal_data")
        organizer_module.seed_organizer_data_direct = organizer_seed

        with patch.dict(os.environ):
            os.environ.pop("ENABLE_PORTAL_SEEDING", None)
            with patch.dict(sys.modules, {
                "seed_student_portal_data": student_module,
                "seed_organizer_portal_data": organizer_module,
            }):
                await seed_portal_data_if_enabled(object())

        student_seed.assert_not_awaited()
        organizer_seed.assert_not_awaited()

    async def test_portal_seeders_are_not_called_when_flag_is_false(self):
        student_seed = AsyncMock()
        organizer_seed = AsyncMock()
        student_module = ModuleType("seed_student_portal_data")
        student_module.seed_student_data_direct = student_seed
        organizer_module = ModuleType("seed_organizer_portal_data")
        organizer_module.seed_organizer_data_direct = organizer_seed

        with patch.dict(os.environ, {"ENABLE_PORTAL_SEEDING": "false"}):
            with patch.dict(sys.modules, {
                "seed_student_portal_data": student_module,
                "seed_organizer_portal_data": organizer_module,
            }):
                await seed_portal_data_if_enabled(object())

        student_seed.assert_not_awaited()
        organizer_seed.assert_not_awaited()

    async def test_portal_seeders_are_not_called_when_flag_is_invalid(self):
        student_seed = AsyncMock()
        organizer_seed = AsyncMock()
        student_module = ModuleType("seed_student_portal_data")
        student_module.seed_student_data_direct = student_seed
        organizer_module = ModuleType("seed_organizer_portal_data")
        organizer_module.seed_organizer_data_direct = organizer_seed

        with patch.dict(os.environ, {"ENABLE_PORTAL_SEEDING": " enabled "}):
            with patch.dict(sys.modules, {
                "seed_student_portal_data": student_module,
                "seed_organizer_portal_data": organizer_module,
            }):
                await seed_portal_data_if_enabled(object())

        student_seed.assert_not_awaited()
        organizer_seed.assert_not_awaited()

    def test_startup_delegates_only_to_guarded_seeding_helper(self):
        main_path = Path(__file__).resolve().parents[1] / "main.py"
        tree = ast.parse(main_path.read_text(encoding="utf-8"))
        called_names = {
            node.func.id
            for node in ast.walk(tree)
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
        }

        self.assertIn("seed_portal_data_if_enabled", called_names)
        self.assertNotIn("seed_student_data_direct", called_names)
        self.assertNotIn("seed_organizer_data_direct", called_names)


if __name__ == "__main__":
    unittest.main()
