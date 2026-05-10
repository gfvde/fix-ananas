import sys
import re

def parse_simple(file_path):
    with open(file_path, 'r') as f:
        lines = f.readlines()
        
    for i, line in enumerate(lines):
        if 'name: ' in line or 'type: ' in line or 'text: ' in line or 'gap: ' in line or 'padding: ' in line or 'fills: ' in line or 'mode: ' in line or 'width: ' in line or 'height: ' in line:
            print(line.rstrip())

if __name__ == "__main__":
    parse_simple(sys.argv[1])
