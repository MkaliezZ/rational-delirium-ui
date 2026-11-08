import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import projector

BASE = 'object_id: ko-20261107-0001\nkind: concept\nstatus: active\ntitle: Example\n'


class YamlReadinessTests(unittest.TestCase):
    def test_inline_relations_and_escaped_title(self):
        title = 'A "quoted" idea'
        parsed = projector.parse_ko(BASE.replace('title: Example', 'title: ' + json.dumps(title)) +
                                    'supports: [ko-20261107-0002]\n')
        self.assertEqual(parsed['title'], title)
        self.assertEqual(parsed['relations']['supports'], ['ko-20261107-0002'])

    def test_block_and_folded_strings_are_full_yaml_values(self):
        fields = projector.parse_fields(BASE + 'provenance:\n  evidence: |\n    One.\n    Two.\n  inference: >\n    One\n    line.\n')
        self.assertEqual(fields['provenance']['evidence'], 'One.\nTwo.\n')
        self.assertEqual(fields['provenance']['inference'], 'One line.\n')

    def test_invalid_ko_is_diagnostic(self):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / 'bad.md').write_text('---\n' + BASE + 'supports: {invalid: map}\n---\n', encoding='utf-8')
            graph = projector.project([tmp])
        self.assertEqual(graph['nodes'], [])
        self.assertEqual(graph['diagnostics'][0]['type'], 'invalid_knowledge_object')

    def test_overlapping_inputs_do_not_invent_duplicate_identity(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'note.md'
            path.write_text('---\n' + BASE + '---\n', encoding='utf-8')
            graph = projector.project([tmp, str(path)])
        self.assertEqual(len(graph['nodes']), 1)
        self.assertEqual(graph['diagnostics'], [])

    def test_duplicate_keys_aliases_and_conflicting_ids_are_refused(self):
        for extra in ['title: Other\n', 'x: &x [1]\ny: *x\n', 'id: DIFFERENT\n']:
            with self.subTest(extra=extra):
                self.assertIsNone(projector.parse_ko(BASE + extra))

    def test_yaml_core_yes_and_dates_stay_strings(self):
        fields = projector.parse_fields('title: yes\ncreated_at: 2026-11-07\nactive: true\n')
        self.assertEqual(fields['title'], 'yes')
        self.assertEqual(fields['created_at'], '2026-11-07')
        self.assertIs(fields['active'], True)


if __name__ == '__main__':
    unittest.main()
