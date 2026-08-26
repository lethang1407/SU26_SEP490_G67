import glob
import os
import re

controller_dir = r'BE_SEP490_G67\src\main\java\project\be_sep490_g67\controller'
files = glob.glob(os.path.join(controller_dir, '*.java'))

for fpath in sorted(files):
    fname = os.path.basename(fpath)
    with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    
    base_path = ""
    for line in lines:
        if "@RequestMapping" in line:
            base_path = line.strip()
            break
            
    print(f"\n==========================================")
    print(f"CONTROLLER: {fname}")
    print(f"CLASS MAPPING: {base_path}")
    print(f"==========================================")
    
    for idx, line in enumerate(lines):
        line_str = line.strip()
        if any(ann in line_str for ann in ['@GetMapping', '@PostMapping', '@PutMapping', '@DeleteMapping', '@PatchMapping', '@PreAuthorize']):
            print(f"L{idx+1}: {line_str}")
            # print up to next 3 lines for context
            for k in range(1, 4):
                if idx + k < len(lines):
                    sub_line = lines[idx+k].strip()
                    if sub_line:
                        print(f"   -> {sub_line}")
                    if "public" in sub_line or "ApiResponse" in sub_line:
                        break
