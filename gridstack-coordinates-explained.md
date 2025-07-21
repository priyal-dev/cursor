# GridStack Coordinates System Explained

## 🔄 How GridStack Coordinates Work

### Basic Coordinate System
```
GridStack uses a column-based coordinate system:
- X = Column position (0 to columns-1, default 12 columns)
- Y = Row position (0 to infinity)
- W = Width in columns (1 to remaining columns)
- H = Height in rows (1 to infinity)
```

### Example: 8-Column Grid
```
Columns: 0  1  2  3  4  5  6  7
Row 0:  [A][A][B][B][B][C][C][D]
Row 1:  [A][A][E][E][E][E][E][E]
Row 2:  [F][F][F][F][G][G][H][H]

Item A: x=0, y=0, w=2, h=2  (2 cols wide, 2 rows tall)
Item B: x=2, y=0, w=3, h=1  (3 cols wide, 1 row tall)
Item C: x=5, y=0, w=2, h=1  (2 cols wide, 1 row tall)
Item D: x=7, y=0, w=1, h=1  (1 col wide, 1 row tall)
Item E: x=2, y=1, w=6, h=1  (6 cols wide, 1 row tall)
Item F: x=0, y=2, w=4, h=1  (4 cols wide, 1 row tall)
Item G: x=4, y=2, w=2, h=1  (2 cols wide, 1 row tall)
Item H: x=6, y=2, w=2, h=1  (2 cols wide, 1 row tall)
```

## 🏗️ Main Grid vs Nested Grid Coordinates

### Main Grid Coordinates
```typescript
// Main grid: Coordinates are absolute to the page grid
const mainGrid = GridStack.init({ column: 8 });

// Item in main grid
{
  id: 'item1',
  x: 2,  // Column 2 in MAIN grid
  y: 1,  // Row 1 in MAIN grid
  w: 3,  // 3 columns wide in MAIN grid
  h: 2   // 2 rows tall in MAIN grid
}
```

### Nested Grid Coordinates
```typescript
// Nested grid: Coordinates are RELATIVE to the parent container
{
  id: 'container',
  x: 1, y: 0, w: 6, h: 4,  // Container position in MAIN grid
  subGridOpts: {
    column: 6,  // Nested grid has 6 columns
    children: [
      {
        id: 'nested1',
        x: 0,  // Column 0 in NESTED grid (not main grid!)
        y: 0,  // Row 0 in NESTED grid (not main grid!)
        w: 2,  // 2 columns in NESTED grid
        h: 1   // 1 row in NESTED grid
      }
    ]
  }
}
```

## 🚨 The Coordinate Translation Problem

### Visual Example:
```
MAIN GRID (8 columns):
┌─────────────────────────────────────────────────────────┐
│ 0   1   2   3   4   5   6   7                          │
│ ┌───┐ ┌─────────────────────────┐ ┌───┐               │ Row 0
│ │ A │ │      CONTAINER          │ │ B │               │
│ └───┘ │  ┌───┬───┬───┬───┬───┐  │ └───┘               │ Row 1
│       │  │ C │ D │   │   │ E │  │                     │
│       │  └───┴───┴───┴───┴───┘  │                     │ Row 2
│       └─────────────────────────┘                     │
└─────────────────────────────────────────────────────────┘

Item A (main grid):     x=0, y=0, w=1, h=2
Container (main grid):  x=1, y=0, w=6, h=3
Item B (main grid):     x=7, y=0, w=1, h=1

NESTED GRID inside Container (6 columns):
Item C (nested): x=0, y=0, w=1, h=1  // Relative to nested grid!
Item D (nested): x=1, y=0, w=1, h=1  // Relative to nested grid!
Item E (nested): x=4, y=0, w=1, h=1  // Relative to nested grid!
```

## 🔍 What Happens During Drag & Drop

### Scenario 1: Moving Within Same Grid
```typescript
// Before drag (in main grid)
item: { id: 'item1', x: 2, y: 1, w: 2, h: 1 }

// After drag (still in main grid)
// ✅ Coordinates remain in same coordinate system
item: { id: 'item1', x: 4, y: 2, w: 2, h: 1 }
```

### Scenario 2: Moving From Main → Nested Grid
```typescript
// Before: Item in main grid
item: { id: 'item1', x: 2, y: 1, w: 2, h: 1 }  // Main grid coordinates

// After: Item moved to nested grid
// ❌ PROBLEM: GridStack might return coordinates in wrong system!
// Event might show: { x: 2, y: 1, w: 2, h: 1 }  // Still main grid coords?
// Or it might show: { x: 0, y: 0, w: 2, h: 1 }  // Nested grid coords?

// ✅ CORRECT: Should be nested grid coordinates
item: { id: 'item1', x: 0, y: 0, w: 2, h: 1 }  // Relative to nested grid
```

### Scenario 3: Moving From Nested → Main Grid
```typescript
// Before: Item in nested grid
item: { id: 'item1', x: 1, y: 0, w: 2, h: 1 }  // Nested grid coordinates

// After: Item moved to main grid  
// ✅ CORRECT: Should be main grid coordinates
item: { id: 'item1', x: 3, y: 2, w: 2, h: 1 }  // Main grid coordinates
```

## 🎯 How to Get Correct Positions

### Method 1: Use Change Event Items (Recommended)
```typescript
grid.on('change', (event: Event, items: GridStackNode[]) => {
  // ✅ These items have CORRECT coordinates for THIS grid
  items.forEach(item => {
    console.log(`Item ${item.id} in this grid:`, {
      x: item.x,  // Correct X for THIS grid context
      y: item.y,  // Correct Y for THIS grid context
      w: item.w,  // Correct width
      h: item.h   // Correct height
    });
  });
});
```

### Method 2: Track Grid Context
```typescript
// Keep track of which grid each item belongs to
const itemGridMapping = new Map();

// Main grid change
mainGrid.on('change', (event, items) => {
  items.forEach(item => {
    itemGridMapping.set(item.id, 'main');
    // Save with main grid context
    savePosition(item, 'main');
  });
});

// Nested grid change
nestedGrid.on('change', (event, items) => {
  items.forEach(item => {
    itemGridMapping.set(item.id, nestedGridId);
    // Save with nested grid context
    savePosition(item, nestedGridId);
  });
});
```

### Method 3: Coordinate Validation
```typescript
function validateAndCorrectPosition(item: GridStackNode, gridId: string) {
  const grid = getGridById(gridId);
  const maxCol = grid.getColumn();
  
  // Ensure coordinates are within grid bounds
  if (item.x < 0) item.x = 0;
  if (item.x >= maxCol) item.x = maxCol - 1;
  if (item.y < 0) item.y = 0;
  if (item.x + item.w > maxCol) item.w = maxCol - item.x;
  
  return item;
}
```

## 🏆 Complete Solution Pattern

```typescript
class GridCoordinateTracker {
  private grids = new Map<string, GridStack>();
  private itemLocations = new Map<string, string>(); // itemId → gridId
  
  setupGrid(grid: GridStack, gridId: string) {
    this.grids.set(gridId, grid);
    
    grid.on('change', (event, items) => {
      this.handlePositionChange(items, gridId);
    });
    
    grid.on('added', (event, items) => {
      items.forEach(item => {
        this.itemLocations.set(item.id, gridId);
        if (item.subGrid) {
          const nestedId = `${gridId}-${item.id}`;
          this.setupGrid(item.subGrid, nestedId);
        }
      });
    });
    
    grid.on('removed', (event, items) => {
      items.forEach(item => {
        this.itemLocations.delete(item.id);
      });
    });
  }
  
  handlePositionChange(items: GridStackNode[], gridId: string) {
    items.forEach(item => {
      // Update item location tracking
      this.itemLocations.set(item.id, gridId);
      
      // Validate coordinates for this grid
      const grid = this.grids.get(gridId);
      const maxCol = grid?.getColumn() || 12;
      
      // ✅ These are CORRECT coordinates for THIS grid
      const position = {
        id: item.id,
        gridId: gridId,
        x: Math.max(0, Math.min(item.x, maxCol - 1)),
        y: Math.max(0, item.y),
        w: Math.max(1, Math.min(item.w, maxCol - item.x)),
        h: Math.max(1, item.h),
        content: item.content
      };
      
      // Save to your layout structure
      this.updateLayoutPosition(position);
      
      console.log(`✅ Item ${item.id} positioned in grid ${gridId}:`, position);
    });
  }
  
  updateLayoutPosition(position: any) {
    // Update your current_layout_data with the correct position
    // in the correct grid context
  }
}
```

## 🎯 Key Takeaways

1. **Main Grid**: Coordinates are absolute (0 to columns-1)
2. **Nested Grid**: Coordinates are relative to parent container (0 to nested-columns-1)
3. **Change Event**: Always provides coordinates in the correct context for THAT grid
4. **grid.save()**: Can mix up coordinate systems - avoid for nested grids
5. **grid.engine.nodes**: May have stale/incorrect coordinates

## ✅ Best Practice

```typescript
// ✅ ALWAYS use the change event items
grid.on('change', (event: Event, items: GridStackNode[]) => {
  // These coordinates are GUARANTEED to be correct for THIS grid
  items.forEach(item => {
    saveItemPosition(item, currentGridId);
  });
});

function saveItemPosition(item: GridStackNode, gridId: string) {
  console.log(`Saving ${item.id} in grid ${gridId}:`, {
    x: item.x,  // ✅ Correct for this grid context
    y: item.y,  // ✅ Correct for this grid context
    w: item.w,  // ✅ Correct width
    h: item.h   // ✅ Correct height
  });
  
  // Update your layout data structure here
}
```

The key insight is that **each grid has its own coordinate system**, and the change event always provides coordinates in the correct context for that specific grid!