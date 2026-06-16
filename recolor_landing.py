import re

with open("app/page.tsx", "r") as f:
    content = f.read()

# Backgrounds
content = re.sub(r'(?:bg-\[#080C18\]|bg-\[#0A0F1E\]|bg-\[#0F1629\]|bg-\[#141C35\]|bg-slate-950/80|bg-[#141C35]/60|bg-[#080C18]/95|bg-[#080C18]/70)', 'bg-[#F7F5F0]', content)
content = content.replace('bg-[#141C35]/60', 'bg-[#FFFFFF]')
content = content.replace('bg-[#141C35]/90', 'bg-[#F0ECE1]')
content = content.replace('bg-slate-950/80', 'bg-[#FFFFFF]')
content = content.replace('bg-[#0A0F1E]', 'bg-[#FFFFFF]')
content = content.replace('bg-slate-950', 'bg-[#FFFFFF]')
content = content.replace('bg-slate-900', 'bg-[#EBE8E0]')
content = content.replace('bg-slate-950/30', 'bg-[#F7F5F0]')

# Borders
content = re.sub(r'(?:border-white/5|border-white/10|border-white/20)', 'border-[#EBE8E0]', content)

# Text
content = re.sub(r'text-\[#F8FAFC\]|text-white', 'text-[#3D3B38]', content)
content = re.sub(r'text-\[#94A3B8\]', 'text-[#8D8B86]', content)

# Accents (matching ProjectBoard)
content = content.replace('#6366F1', '#635BFF') # Indigo -> Purple
content = content.replace('#8B5CF6', '#635BFF') # Violet -> Purple
content = content.replace('#06B6D4', '#5C99D6') # Cyan -> Blue
content = content.replace('#10B981', '#83B593') # Emerald -> Green
content = content.replace('#F59E0B', '#E67F63') # Amber -> Orange
content = content.replace('#F43F5E', '#E67F63') # Rose -> Orange

# Specific glass-card styling (make it a clean solid card instead of blurry glass)
content = content.replace('bg-[#141C35]/40', 'bg-[#FFFFFF]')
content = content.replace('backdrop-blur-[20px]', '')
content = content.replace('backdrop-blur-md', '')
content = content.replace('backdrop-blur-sm', '')
content = content.replace('glass-card', 'bg-[#FFFFFF] border border-[#EBE8E0] shadow-sm rounded-2xl')

# Fix specific button classes that became text-[#3D3B38] instead of white
content = content.replace('bg-gradient-to-r from-[#635BFF] to-[#635BFF] text-[#3D3B38]', 'bg-[#3D3B38] text-[#FFFFFF]')
content = content.replace('bg-[#3D3B38] text-[#3D3B38]', 'bg-[#3D3B38] text-[#FFFFFF]')

with open("app/page.tsx", "w") as f:
    f.write(content)

print("Color replacement complete.")
