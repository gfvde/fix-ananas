import re

with open('footer.jinja', 'r') as f:
    content = f.read()

# 1. Update footer root classes
content = re.sub(
    r'<footer\s+id="footer"([^>]*?)class="flex flex-col"(.*?)>',
    r'<footer\n  id="footer"\1class="flex flex-col px-6 pt-4 pb-6 gap-2 md:px-20 md:pt-8 md:pb-6 md:gap-8"\2>',
    content, flags=re.DOTALL
)

# 2. Update Main grid wrapper (remove px-6 pt-4 pb-6 md:px-20 md:pt-8 md:pb-6 from inner div)
content = content.replace(
    '<div class="px-6 pt-4 pb-6 md:px-20 md:pt-8 md:pb-6 flex-grow">',
    '<div class="flex-grow w-full">'
)

# 3. Update grid classes
content = content.replace(
    '<div class="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 md:gap-x-10">',
    '<div class="grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-4 md:gap-8">'
)

# 4. Update Link groups inner gap and text sizes
content = content.replace('<div class="flex flex-col gap-3">', '<div class="flex flex-col gap-[10px]">')
content = content.replace('<ul class="flex flex-col gap-2">', '<ul class="flex flex-col gap-[10px]">')
content = content.replace('text-sm hover:opacity-100', 'text-xs hover:opacity-100')

# 5. Update Contact Column text sizes
content = content.replace('gap-2 text-sm transition-opacity', 'gap-2 text-xs transition-opacity')

# 6. Update Legal / Payments Wrapper
content = content.replace(
    '<div class="px-6 md:px-20 py-6 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">',
    '<div class="py-4 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4 w-full">'
)

# 7. Legal badges typography and gaps
content = content.replace('w-8 h-8 rounded-full', 'w-7 h-7 rounded-full')
content = content.replace('text-[10px]', 'text-[9px]')
content = content.replace('text-xs font-semibold', 'text-[11px] font-bold')
content = content.replace('gap-1.5', 'gap-1.5') # Keep 6px or make it gap-1 (4px)
content = content.replace('gap-1">', 'gap-0.5">')

# 8. Dividers
content = content.replace('<div class="mx-6 md:mx-20" style="border-top: 1px solid {{ divider_color }};"></div>', '<div class="w-full" style="border-top: 1px solid {{ divider_color }};"></div>')

# 9. Bottom bar
content = content.replace(
    '<div class="px-6 md:px-20 py-4 flex flex-col md:flex-row items-center justify-between gap-3">',
    '<div class="py-4 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 w-full">'
)

with open('footer.jinja', 'w') as f:
    f.write(content)
print("Updated footer.jinja successfully!")
