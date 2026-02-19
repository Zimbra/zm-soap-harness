import os
import xml.etree.ElementTree as ET

def count_tests_in_folder(folder_path):
    counts = {
        'Smoke': 0,
        'Sanity': 0,
        'Functional': 0,
        'Regression': 0
    }
    
    if not os.path.exists(folder_path):
        return counts

    try:
        files = [f for f in os.listdir(folder_path) if f.endswith('.xml')]
    except OSError:
        return counts

    for file in files:
        file_path = os.path.join(folder_path, file)
        try:
            tree = ET.parse(file_path)
            root = tree.getroot()
            
            for elem in root.iter():
                if elem.tag.endswith('test_case'):
                    t_type = elem.get('type')
                    if t_type:
                        t_type_lower = t_type.lower()
                        
                        # Check for inclusion to handle comma-separated values like "sanity,regression"
                        if 'smoke' in t_type_lower:
                            counts['Smoke'] += 1
                        if 'sanity' in t_type_lower:
                            counts['Sanity'] += 1
                        if 'functional' in t_type_lower:
                            counts['Functional'] += 1
                        if 'regression' in t_type_lower or 'deprecated' not in t_type_lower and 'sanity' not in t_type_lower and 'smoke' not in t_type_lower and 'functional' not in t_type_lower:
                            # Wait, user asked for Regression counts specifically. 
                            # If a test is NOT labeled, it might be regression by default? 
                            # I better stick to specific "regression" label OR check if there's a convention.
                            # In `ACL-Basic.xml`, I saw "always", "sanity".
                            # I should only count "regression" if the word is there?
                            # Let's start with strict matching. 
                            pass
                        
                        if 'regression' in t_type_lower:
                            counts['Regression'] += 1
                            
        except ET.ParseError:
            # Fallback for malformed XML or other parsing issues if necessary
            # For now, just print error to stderr but don't crash
            # print(f"Error parsing {file_path}")
            pass
        except Exception:
            pass
            
    return counts

def main():
    base_dir = r"c:\git\zm-soap-harness\data\soapvalidator"
    
    # Header
    print(f"{'Folder':<60} | {'Smoke':<6} | {'Sanity':<6} | {'Functional':<10} | {'Regression':<10}")
    print("-" * 110)
    
    for root, dirs, files in os.walk(base_dir):
        if any(f.endswith('.xml') for f in files):
            counts = count_tests_in_folder(root)
            rel_path = os.path.relpath(root, base_dir)
            if rel_path == '.':
                rel_path = "Root"
                
            # Only print if there are non-zero counts? User said "test count each folder"
            # If all are 0, maybe still show it? Or maybe skip?
            # Let's show it if there are XML files.
            
            print(f"{rel_path:<60} | {counts['Smoke']:<6} | {counts['Sanity']:<6} | {counts['Functional']:<10} | {counts['Regression']:<10}")

if __name__ == "__main__":
    main()
