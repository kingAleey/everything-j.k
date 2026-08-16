import math

CX, CY = 256, 256  # emblem center
BADGE_CX, BADGE_CY = 256, 252  # center badge center
BADGE_R = 132
RING_R = 230
DOTS_R = 208

def pt(center, r, deg):
    rad = math.radians(deg)
    return (round(center[0] + r * math.cos(rad), 1), round(center[1] + r * math.sin(rad), 1))

def arc_path(center, r, a1, a2):
    p1 = pt(center, r, a1)
    p2 = pt(center, r, a2)
    return f'M {p1[0]} {p1[1]} A {r} {r} 0 0 1 {p2[0]} {p2[1]}'

# dots on the orbit ring
dots = []
for i in range(12):
    d = i * 30
    p = pt((CX, CY), DOTS_R, d)
    dots.append(f'<circle cx="{p[0]}" cy="{p[1]}" r="6.5" fill="url(#grad2)" opacity=".8"/>')

# broadcast arcs (left + right of the badge)
def arc_set(center, radii, a1, a2, dot):
    out = [f'<circle cx="{center[0]}" cy="{center[1]}" r="11" fill="url(#grad2)" opacity=".9"/>']
    for r in radii:
        out.append(f'<path d="{arc_path(center, r, a1, a2)}" stroke="url(#grad2)" stroke-width="13" fill="none" stroke-linecap="round" opacity=".8"/>')
    return out

LEFT_C = (round(CX - 93.0, 1), round(CY - 93.0, 1))   # (163, 163)
RIGHT_C = (round(CX + 93.0, 1), round(CY - 93.0, 1))  # (349, 163)
RADII = [36, 60, 88]
left_arcs = arc_set(LEFT_C, RADII, 128, 232, None)
right_arcs = arc_set(RIGHT_C, RADII, -52, 52, None)

sparkles = [
    '<path d="M 96 96 l 4 10 l 10 4 l -10 4 l -4 10 l -4 -10 l -10 -4 l 10 -4 z" fill="#f472b6" opacity=".85"/>',
    '<path d="M 420 78 l 3 8 l 8 3 l -8 3 l -3 8 l -3 -8 l -8 -3 l 8 -3 z" fill="#22d3ee" opacity=".8"/>',
    '<path d="M 116 424 l 3.5 9 l 9 3.5 l -9 3.5 l -3.5 9 l -3.5 -9 l -9 -3.5 l 9 -3.5 z" fill="#a855f7" opacity=".75"/>',
]

EMBLEM = f'''  <g id="emblem">
    <circle cx="{CX}" cy="{CY}" r="{RING_R}" fill="none" stroke="url(#grad1)" stroke-width="8" opacity=".95"/>
    <g>{''.join(dots)}</g>
    {''.join(left_arcs)}
    {''.join(right_arcs)}
    {''.join(sparkles)}
    <circle cx="{BADGE_CX}" cy="{BADGE_CY}" r="{BADGE_R}" fill="url(#grad1)"/>
    <circle cx="{BADGE_CX}" cy="{BADGE_CY}" r="116" fill="#0a0c1c"/>
    <circle cx="{BADGE_CX}" cy="{BADGE_CY}" r="108" fill="none" stroke="url(#grad2)" stroke-width="4" opacity=".85"/>
    <text x="{BADGE_CX}" y="288" text-anchor="middle" font-family="Orbitron, 'Arial Black', sans-serif" font-weight="900" font-size="104" fill="#ffffff" letter-spacing="2">J&amp;K</text>
    <text x="{BADGE_CX}" y="322" text-anchor="middle" font-family="Orbitron, 'Arial Black', sans-serif" font-weight="700" font-size="20" fill="#22d3ee" letter-spacing="6">EVERYTHING</text>
  </g>'''

HEAD = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8b5cf6"/>
      <stop offset="55%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>
    <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#22d3ee"/>
      <stop offset="100%" stop-color="#f472b6"/>
    </linearGradient>
  </defs>
'''

# logo.svg = emblem only (nav, favicon)
with open('assets/logo.svg', 'w') as f:
    f.write(HEAD + EMBLEM + '\n</svg>\n')

# logo-full.svg = emblem + wordmark (downloadable brand logo)
full = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 672">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8b5cf6"/>
      <stop offset="55%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>
    <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#22d3ee"/>
      <stop offset="100%" stop-color="#f472b6"/>
    </linearGradient>
  </defs>
  <rect width="512" height="672" rx="48" fill="#0a0c1c"/>
  <g transform="translate(0,28)">{EMBLEM}</g>
  <text x="256" y="596" text-anchor="middle" font-family="Orbitron, 'Arial Black', sans-serif" font-weight="800" font-size="50" letter-spacing="4" fill="url(#grad1)">EVERYTHING J&amp;K</text>
  <text x="256" y="632" text-anchor="middle" font-family="Orbitron, 'Arial Black', sans-serif" font-weight="700" font-size="21" letter-spacing="5" fill="#22d3ee">FASHION &bull; PREORDER &bull; NATIONWIDE</text>
  <text x="256" y="658" text-anchor="middle" font-family="Orbitron, 'Arial Black', sans-serif" font-weight="500" font-size="15" letter-spacing="3" fill="#9aa0c3">DM @EVERYTHING_J.K</text>
</svg>
'''
with open('assets/logo-full.svg', 'w') as f:
    f.write(full)

print('Generated assets/logo.svg and assets/logo-full.svg')
