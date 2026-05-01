import re

file_path = 'client/src/pages/PublicProfile.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace outer wrapper
text = text.replace(
    'className="mt-5 space-y-3"',
    'className={`mt-5 rounded-3xl border p-6 sm:p-8 space-y-6 divide-y ${dark ? "bg-[#0d1520] border-[#1a3050] divide-white/[0.06]" : "bg-white border-gray-200 shadow-sm divide-gray-100"}`}'
)

# Replace inner box classes
old_class = r'className=\{\`rounded-3xl border p-5 \$\{dark \? \"border-white/10 bg-white/\[0\.03\]\" : \"border-gray-200 bg-white\"\}\`\}'
new_class = r'className="pt-6 first:pt-0"'
text = re.sub(old_class, new_class, text)

# Writer Profile has a specific wrapper block inside <>
# There's a case where the grid of two is inside <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
# If those also have boxes, they get pt-6 first:pt-0. But since they are in a grid, maybe we don't want pt-6.
# Actually, the user asked for one box with space. The grid items without borders will look like standard grid items.

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print('Done PublicProfile.jsx')
