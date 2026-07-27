import fitz
import json
import re

def parse_pdf():
    doc = fitz.open("../public/ckript-privacy-policy.pdf")
    text = ""
    for page in doc:
        text += page.get_text()
        
    lines = [line.strip() for line in text.split('\n') if line.strip()]

    sections = []
    current_section = None
    in_header = True

    for line in lines:
        if re.match(r'^Ckript Privacy Policy$', line, re.IGNORECASE) or \
           re.match(r'^Version', line, re.IGNORECASE) or \
           re.match(r'^Effective Date', line, re.IGNORECASE) or \
           re.match(r'^Last Updated', line, re.IGNORECASE) or \
           re.match(r"^We'll also maintain version history", line, re.IGNORECASE):
            continue

        section_match = re.match(r'^(\d+(?:\.\d+)?)\.\s+(.*)', line)
        
        if section_match and "Introduction, Definitions & Scope" not in line and "PART 1" not in line:
            in_header = False
            current_section = {
                "id": section_match.group(1),
                "title": line,
                "content": []
            }
            sections.append(current_section)
        elif not in_header and current_section:
            if line.startswith('●') or line.startswith('-'):
                current_section["content"].append({"type": "bullet", "text": re.sub(r'^[●\-]\s*', '', line)})
            else:
                if len(current_section["content"]) > 0 and current_section["content"][-1]["type"] == "text":
                    last_text = current_section["content"][-1]["text"]
                    if not last_text.endswith('.') and not last_text.endswith(':') and not last_text.endswith('?') and not last_text.endswith('!'):
                        current_section["content"][-1]["text"] += " " + line
                    else:
                        current_section["content"].append({"type": "text", "text": line})
                else:
                    current_section["content"].append({"type": "text", "text": line})

    formatted_sections = []
    for sec in sections:
        formatted_content = []
        current_list = None
        
        for item in sec["content"]:
            if item["type"] == "bullet":
                if current_list is None:
                    current_list = []
                    formatted_content.append({"type": "list", "items": current_list})
                current_list.append(item["text"])
            else:
                current_list = None
                formatted_content.append({"type": "paragraph", "text": item["text"]})
                
        formatted_sections.append({
            "id": f"section-{sec['id'].replace('.', '-')}",
            "title": sec["title"],
            "content": formatted_content
        })

    with open("../src/data/legalText.json", "w", encoding="utf-8") as f:
        json.dump(formatted_sections, f, indent=2, ensure_ascii=False)
        
    print("Successfully parsed PDF to src/data/legalText.json")

if __name__ == "__main__":
    parse_pdf()
