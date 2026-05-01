import re

file_path = 'client/src/pages/Profile.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    'const SectionCard = ({ title, icon, badge, dark, children }) => (',
    'const SectionCard = ({ title, icon, badge, dark, noBox, children }) => ('
)

old_class = '''className={`rounded-2xl p-4 sm:p-6 border transition-colors ${dark
      ? "bg-[#0d1520] border-white/[0.06]"
      : "bg-white border-gray-200/70 shadow-sm"
      }`}'''

new_class = '''className={noBox ? "pt-6 first:pt-0" : `rounded-2xl p-4 sm:p-6 border transition-colors ${dark
      ? "bg-[#0d1520] border-white/[0.06]"
      : "bg-white border-gray-200/70 shadow-sm"
      }`}'''
text = text.replace(old_class, new_class)

start_idx = text.find('{/* ──────── ABOUT TAB ──────── */}')
end_idx = text.find('{/* ──────── PURCHASED SCRIPTS TAB ──────── */}')

if start_idx != -1 and end_idx != -1:
    about_text = text[start_idx:end_idx]
    
    old_wrapper = 'className="space-y-3"'
    new_wrapper = 'className={`rounded-3xl p-6 sm:p-8 border space-y-6 divide-y ${dark ? "bg-[#0d1520] border-[#1a3050] divide-white/[0.06]" : "bg-white border-gray-200 shadow-sm divide-gray-100"}`}'
    about_text = about_text.replace(old_wrapper, new_wrapper)
    
    about_text = about_text.replace('<SectionCard', '<SectionCard noBox')
    
    about_text = re.sub(
        r'profile-bento-card rounded-2xl p-6 border (col-span-1 sm:col-span-1 lg:col-span-2) \$\{t\.bentoCard\}',
        r'pt-6 first:pt-0 \1',
        about_text
    )
    about_text = re.sub(
        r'profile-bento-card rounded-2xl p-6 border flex flex-col items-center justify-center text-center \$\{t\.bentoCard\}',
        r'pt-6 first:pt-0 flex flex-col items-center justify-center text-center',
        about_text
    )
    about_text = re.sub(
        r'profile-bento-card rounded-2xl p-6 border \$\{t\.bentoCard\}',
        r'pt-6 first:pt-0',
        about_text
    )
    about_text = re.sub(
        r'profile-bento-card rounded-2xl p-6 border relative \$\{t\.bentoCard\}',
        r'pt-6 first:pt-0 relative',
        about_text
    )
    
    text = text[:start_idx] + about_text + text[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print('Done Profile.jsx')
