import re

with open("scratch_dashboard.tsx", "r") as f:
    scratch_content = f.read()

# Extract from scratch
# Start from `<div className="min-h-screen...`
start_idx = scratch_content.find('<div className="min-h-screen')
end_idx = scratch_content.find('  );', start_idx)
scratch_jsx = scratch_content[start_idx:end_idx]

# Ensure we import BottomNav at the top of Dashboard if not present
with open("components/Dashboard.tsx", "r") as f:
    dash_content = f.read()

if "import BottomNav" not in dash_content:
    dash_content = dash_content.replace('import { Settings', "import BottomNav from './BottomNav';\nimport { Settings")

# Find the return ( block in Dashboard.tsx
dash_start = dash_content.find('<div className="min-h-screen bg-surface-muted')
if dash_start == -1:
    print("Could not find start in Dashboard")
    exit(1)

# Find where the modals start: {/* Target Nutritional Goals Setup Modal */}
dash_end = dash_content.find('{/* Target Nutritional Goals Setup Modal */}')
if dash_end == -1:
    print("Could not find modals in Dashboard")
    exit(1)

# The dash_end is currently pointing to the comment.
# I want to replace everything from dash_start up to the div closure before the comment.
# Actually, let's just replace from dash_start to dash_end.
# The scratch JSX ends with `</div>` and `<BottomNav />` which we should modify to `<BottomNav onCameraClick={() => setIsUploadModalOpen(true)} />`

scratch_jsx = scratch_jsx.replace('<BottomNav />', '<BottomNav onCameraClick={() => setIsUploadModalOpen(true)} />')

new_dash_content = dash_content[:dash_start] + scratch_jsx + "\n\n      " + dash_content[dash_end:]

with open("components/Dashboard.tsx", "w") as f:
    f.write(new_dash_content)

print("Merged successfully!")
