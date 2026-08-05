import re
import json

def parse_terms():
    with open('extracted_terms.txt', 'r', encoding='utf-8') as f:
        text = f.read()

    # Split by numbered sections (e.g., "1. Introduction", "2. About Ckript")
    # A section title usually starts with a number, a dot, a space, and is followed by text.
    # We should look for lines matching: ^\d+\.\s+[A-Z].*$
    
    sections = []
    
    # Split text into lines
    lines = text.split('\n')
    
    current_section = None
    current_content = []
    
    section_pattern = re.compile(r'^(\d+)\.\s+(.*)$')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        match = section_pattern.match(line)
        if match:
            # Save the previous section
            if current_section:
                sections.append({
                    "id": current_section['id'],
                    "title": current_section['title'],
                    "content": current_content
                })
            
            # Start a new section
            num = match.group(1)
            title_text = match.group(2)
            current_section = {
                "id": f"section-{num}",
                "title": f"{num}. {title_text}"
            }
            current_content = []
        else:
            if current_section:
                current_content.append(line)
                
    if current_section:
        sections.append({
            "id": current_section['id'],
            "title": current_section['title'],
            "content": current_content
        })

    # Now let's group content into paragraphs and bullet points
    # If a line starts with a bullet point character, it's a bullet.
    bullet_chars = ['•', '-', '*']
    
    for sec in sections:
        structured_content = []
        bullets = []
        
        for line in sec['content']:
            is_bullet = any(line.startswith(c) for c in bullet_chars)
            
            if is_bullet:
                bullets.append(line[1:].strip())
            else:
                if bullets:
                    structured_content.append({"type": "bullets", "items": bullets})
                    bullets = []
                structured_content.append({"type": "paragraph", "text": line})
                
        if bullets:
            structured_content.append({"type": "bullets", "items": bullets})
            
        sec['content'] = structured_content

    with open('parsed_terms.json', 'w', encoding='utf-8') as f:
        json.dump(sections, f, indent=2, ensure_ascii=False)
        
    print(f"Parsed {len(sections)} sections.")

if __name__ == '__main__':
    parse_terms()
