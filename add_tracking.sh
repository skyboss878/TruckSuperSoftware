#!/bin/bash
echo "Wiring tracking into dashboards..."

python3 << 'EOF'
def patch(path, old, new, label):
    try:
        c = open(path).read()
        if old in c:
            open(path,'w').write(c.replace(old,new,1))
            print(f'✓ {label}')
        else:
            print(f'✗ NO MATCH: {label}')
    except FileNotFoundError:
        print(f'✗ NOT FOUND: {label}')

# Add tracking to driver menu
patch('app/driver/page.js',
  """                { label: 'AI Assistant', icon: '🤖', path: '/driver/assistant' },""",
  """                { label: 'AI Assistant', icon: '🤖', path: '/driver/assistant' },
                { label: 'Trip Tracker', icon: '📍', path: '/driver/tracking' },""",
  'Driver menu - Trip Tracker')

# Add Live Map tab to admin dashboard
patch('app/admin/page.js',
  """          { key: 'assistant', label: '🤖 AI' },""",
  """          { key: 'assistant', label: '🤖 AI' },
          { key: 'tracking', label: '📍 Live Map' },""",
  'Admin tabs - Live Map')

# Add tracking redirect to admin dashboard
patch('app/admin/page.js',
  """        {tab === 'assistant' && (() => { setTimeout(() => router.push('/admin/assistant'), 0); return null })()}""",
  """        {tab === 'assistant' && (() => { setTimeout(() => router.push('/admin/assistant'), 0); return null })()}
        {tab === 'tracking' && (() => { setTimeout(() => router.push('/admin/tracking'), 0); return null })()}""",
  'Admin redirect - tracking')

# Add assistant to driver menu (if not already there)
patch('app/driver/page.js',
  """                { label: 'Compliance', icon: '📋', path: '/driver/compliance' },
                { label: 'AI Assistant', icon: '🤖', path: '/driver/assistant' },""",
  """                { label: 'Compliance', icon: '📋', path: '/driver/compliance' },
                { label: 'AI Assistant', icon: '🤖', path: '/driver/assistant' },""",
  'Driver menu - already set')

EOF

echo "Done. Committing..."
git add -A && git commit -m "feat: GPS tracking, live fleet map, panic button, AI assistant" && git push origin main
