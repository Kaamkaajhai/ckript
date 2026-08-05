import PyPDF2
import json
import re

def extract_pdf_text(filepath):
    text = ""
    with open(filepath, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        for page in reader.pages:
            text += page.extract_text() + "\n"
    return text

if __name__ == '__main__':
    text = extract_pdf_text('client/public/CKRIPT TERMS.pdf')
    with open('extracted_terms.txt', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Extracted text saved to extracted_terms.txt")
