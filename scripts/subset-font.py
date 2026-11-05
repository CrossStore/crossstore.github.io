"""Optional typography asset refresh; normal site builds use the checked-in WOFF2.
Usage: python scripts/subset-font.py /path/to/SourceHanSerifSC-Regular.otf
Requires fonttools[woff]. Source and OFL are recorded in docs/homepage-design.md.
"""
import json
import sys
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1]
messages = json.loads((root / 'src/messages.json').read_text())
text = ''.join(value for entry in messages.values() for value in entry.values())
text += ''.join(chr(n) for n in range(32, 127)) + 'CrossStore↗↺↓↑←→＋−×‹›'
font = TTFont(sys.argv[1])
options = subset.Options()
options.flavor = 'woff2'
options.hinting = False
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=text)
subsetter.subset(font)
# This subset is a modified font. Give it its own name under the OFL.
for record in font['name'].names:
    replacement = {1:'CrossStore Editorial',2:'Regular',3:'CrossStore Editorial Regular',4:'CrossStore Editorial Regular',6:'CrossStoreEditorial-Regular',16:'CrossStore Editorial',17:'Regular'}.get(record.nameID)
    if replacement:
        record.string = replacement.encode(record.getEncoding())
if 'CFF ' in font:
    cff = font['CFF '].cff
    cff.fontNames = ['CrossStoreEditorial-Regular']
    top = cff.topDictIndex[0]
    top.FamilyName = 'CrossStore Editorial'
    top.FullName = 'CrossStore Editorial Regular'
font.flavor = 'woff2'
font.save(root / 'public/assets/fonts/crossstore-serif.woff2')
print('Wrote local editorial font subset.')
