"""
Seed default newspaper templates.
Creates the three standard layout templates if they don't exist.
"""

from django.core.management.base import BaseCommand
from editions.models import Template


TEMPLATES = [
    {
        'name': 'Classic Broadsheet',
        'description': 'Traditional newspaper layout with bold rules, deep maroon accents, and classic typography spacing. Evokes heritage broadsheet papers.',
        'layout_definition': {
            'style_preset': 'CLASSIC',
            'accent_color': '#8B0000',
            'border_style': 'thick',
            'column_rules': 'heavy',
            'typography': 'serif-heavy',
        },
        'is_active': True,
    },
    {
        'name': 'Modern Magazine',
        'description': 'Clean magazine-style grid with vibrant red accents, thin borders, and contemporary typography. Minimal and elegant.',
        'layout_definition': {
            'style_preset': 'MODERN',
            'accent_color': '#E63946',
            'border_style': 'thin',
            'column_rules': 'light',
            'typography': 'sans-forward',
        },
        'is_active': True,
    },
    {
        'name': 'Default',
        'description': 'Balanced newspaper layout with standard rules and classic red accents. The default बी.आर.टाइम्स style.',
        'layout_definition': {
            'style_preset': 'DEFAULT',
            'accent_color': '#C1121F',
            'border_style': 'standard',
            'column_rules': 'standard',
            'typography': 'balanced',
        },
        'is_active': True,
    },
]


class Command(BaseCommand):
    help = 'Seed the three default newspaper layout templates'

    def handle(self, *args, **options):
        created_count = 0
        for tmpl_data in TEMPLATES:
            _, created = Template.objects.get_or_create(
                name=tmpl_data['name'],
                defaults=tmpl_data,
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'  Created: {tmpl_data["name"]}'))
            else:
                self.stdout.write(f'  Exists: {tmpl_data["name"]}')

        self.stdout.write(self.style.SUCCESS(f'\nDone. {created_count} template(s) created.'))
