// PRACTICAL EXAMPLE: How to Get Correct Coordinates During Drag & Drop

class GridStackCoordinateExample {
  grid: GridStack;
  current_layout_data: any[] = [];
  private gridInstances = new Map<string, GridStack>();
  private itemTracker = new Map<string, string>(); // itemId → gridId

  initializeWithCorrectCoordinates() {
    // Initialize main grid (8 columns as per your setup)
    this.grid = GridStack.init({
      column: 8,
      removable: '#trash',
      acceptWidgets: true,
      float: false,
      resizable: { handles: 'se,e,s,sw,w' }
    });

    // Register main grid
    this.gridInstances.set('main', this.grid);
    
    // Set up coordinate tracking
    this.setupCoordinateTracking('main', this.grid);
    
    GridStack.renderCB = (el: HTMLElement, w: GridStackNode) => {
      if (w.content) {
        el.innerHTML = w.content;
      }
    };

    // Load existing layout
    if (this.current_layout_data[0]?.layout_json_temp) {
      this.loadLayoutAndTrackItems();
    }
  }

  setupCoordinateTracking(gridId: string, grid: GridStack) {
    console.log(`🔧 Setting up coordinate tracking for grid: ${gridId}`);
    
    // 🎯 MAIN EVENT: Capture correct coordinates when items change
    grid.on('change', (event: Event, items: GridStackNode[]) => {
      console.log(`\n📍 CHANGE EVENT in grid "${gridId}":`, items.length, 'items');
      
      items.forEach(item => {
        // ✅ These coordinates are GUARANTEED correct for THIS grid
        console.log(`✅ Item "${item.id}" new position in grid "${gridId}":`, {
          x: item.x,  // Column position in THIS grid (0 to grid.column-1)
          y: item.y,  // Row position in THIS grid (0+)
          w: item.w,  // Width in columns
          h: item.h,  // Height in rows
          content: !!item.content
        });
        
        // Track which grid this item is now in
        this.itemTracker.set(item.id!, gridId);
        
        // Validate coordinates are within grid bounds
        this.validateCoordinates(item, gridId);
      });
      
      // Update layout with these CORRECT coordinates
      this.updateLayoutWithCorrectPositions(items, gridId);
    });

    // 🆕 Track when items are added (including from other grids)
    grid.on('added', (event: Event, items: GridStackNode[]) => {
      console.log(`\n➕ ADDED to grid "${gridId}":`, items.length, 'items');
      
      items.forEach(item => {
        console.log(`➕ Item "${item.id}" added to grid "${gridId}" at:`, {
          x: item.x, y: item.y, w: item.w, h: item.h
        });
        
        // Track location
        this.itemTracker.set(item.id!, gridId);
        
        // If this item has a nested grid, set up tracking for it
        if (item.subGrid && item.id) {
          const nestedGridId = `${gridId}-${item.id}`;
          console.log(`🔧 Setting up nested grid: ${nestedGridId}`);
          this.gridInstances.set(nestedGridId, item.subGrid);
          this.setupCoordinateTracking(nestedGridId, item.subGrid);
        }
      });
      
      // Update layout
      this.rebuildCompleteLayout();
    });

    // 🗑️ Track when items are removed
    grid.on('removed', (event: Event, items: GridStackNode[]) => {
      console.log(`\n➖ REMOVED from grid "${gridId}":`, items.length, 'items');
      
      items.forEach(item => {
        console.log(`➖ Item "${item.id}" removed from grid "${gridId}"`);
        this.itemTracker.delete(item.id!);
        
        // Clean up nested grid tracking
        const nestedGridId = `${gridId}-${item.id}`;
        if (this.gridInstances.has(nestedGridId)) {
          this.gridInstances.delete(nestedGridId);
        }
      });
      
      this.rebuildCompleteLayout();
    });
  }

  // 🔍 Validate coordinates are within grid bounds
  validateCoordinates(item: GridStackNode, gridId: string) {
    const grid = this.gridInstances.get(gridId);
    if (!grid) return;
    
    const maxCol = grid.getColumn();
    const issues: string[] = [];
    
    if (item.x! < 0) issues.push(`x=${item.x} < 0`);
    if (item.x! >= maxCol) issues.push(`x=${item.x} >= ${maxCol}`);
    if (item.y! < 0) issues.push(`y=${item.y} < 0`);
    if (item.x! + item.w! > maxCol) issues.push(`x+w=${item.x! + item.w!} > ${maxCol}`);
    
    if (issues.length > 0) {
      console.warn(`⚠️ Coordinate issues for item "${item.id}" in grid "${gridId}":`, issues);
    } else {
      console.log(`✅ Coordinates valid for item "${item.id}" in grid "${gridId}"`);
    }
  }

  // 💾 Update layout with correct positions from change event
  updateLayoutWithCorrectPositions(changedItems: GridStackNode[], gridId: string) {
    console.log(`\n💾 Updating layout for ${changedItems.length} items in grid "${gridId}"`);
    
    const layout = this.current_layout_data[0]?.layout_json_temp;
    if (!layout) {
      console.log('⚠️ No existing layout, rebuilding from scratch');
      this.rebuildCompleteLayout();
      return;
    }

    // Find and update each changed item in the layout structure
    changedItems.forEach(item => {
      const updated = this.updateItemInLayoutStructure(layout, item, gridId);
      if (updated) {
        console.log(`✅ Updated item "${item.id}" in layout structure`);
      } else {
        console.warn(`⚠️ Could not find item "${item.id}" in layout structure`);
      }
    });

    // Save updated layout
    this.current_layout_data[0].layout_json_temp = layout;
    console.log('💾 Layout saved successfully');
  }

  // 🔍 Find and update specific item in nested layout structure
  updateItemInLayoutStructure(layout: any, item: GridStackNode, targetGridId: string): boolean {
    return this.searchAndUpdateInChildren(layout.children || [], item, targetGridId, 'main');
  }

  // 🔍 Recursively search through layout structure
  searchAndUpdateInChildren(children: any[], item: GridStackNode, targetGridId: string, currentGridId: string): boolean {
    if (currentGridId === targetGridId) {
      // We're in the target grid - find and update the item
      const existingItem = children.find(child => child.id === item.id);
      if (existingItem) {
        // ✅ Update with CORRECT coordinates from change event
        existingItem.x = item.x;
        existingItem.y = item.y;
        existingItem.w = item.w;
        existingItem.h = item.h;
        if (item.content) existingItem.content = item.content;
        
        console.log(`🔄 Updated item "${item.id}" coordinates:`, {
          x: item.x, y: item.y, w: item.w, h: item.h
        });
        return true;
      }
    } else {
      // Search in nested grids
      for (const child of children) {
        if (child.subGridOpts?.children) {
          const nestedGridId = currentGridId === 'main' ? child.id : `${currentGridId}-${child.id}`;
          if (this.searchAndUpdateInChildren(child.subGridOpts.children, item, targetGridId, nestedGridId)) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  // 🏗️ Rebuild complete layout from current grid states
  rebuildCompleteLayout() {
    console.log('\n🏗️ Rebuilding complete layout from current grid states');
    
    const newLayout = {
      children: this.extractGridChildren(this.grid, 'main')
    };
    
    this.current_layout_data[0] = {
      ...this.current_layout_data[0],
      layout_json_temp: newLayout
    };
    
    console.log('🏗️ Layout rebuilt successfully');
  }

  // 📋 Extract children from grid with correct coordinates
  extractGridChildren(grid: GridStack, gridId: string): any[] {
    return grid.engine.nodes.map(node => {
      const nodeData = {
        id: node.id,
        x: node.x,  // Current position in this grid
        y: node.y,  // Current position in this grid
        w: node.w,  // Current width
        h: node.h,  // Current height
        content: node.content
      };

      // Handle nested grids
      if (node.subGrid) {
        const nestedGridId = gridId === 'main' ? node.id : `${gridId}-${node.id}`;
        nodeData.subGridOpts = {
          children: this.extractGridChildren(node.subGrid, nestedGridId)
        };
      }

      return nodeData;
    });
  }

  // 📂 Load layout and track items
  loadLayoutAndTrackItems() {
    this.grid = GridStack.addGrid(
      document.querySelector('.container-fluid'),
      this.current_layout_data[0]?.layout_json_temp
    );
    
    // Track all items and their nested grids
    this.trackAllItemsRecursively();
  }

  // 🔍 Track all existing items and set up nested grids
  trackAllItemsRecursively() {
    const trackGrid = (grid: GridStack, gridId: string) => {
      grid.engine.nodes.forEach(node => {
        if (node.id) {
          this.itemTracker.set(node.id, gridId);
          console.log(`📍 Tracking item "${node.id}" in grid "${gridId}"`);
        }
        
        if (node.subGrid && node.id) {
          const nestedGridId = gridId === 'main' ? node.id : `${gridId}-${node.id}`;
          this.gridInstances.set(nestedGridId, node.subGrid);
          this.setupCoordinateTracking(nestedGridId, node.subGrid);
          trackGrid(node.subGrid, nestedGridId);
        }
      });
    };

    trackGrid(this.grid, 'main');
  }

  // 🐛 Debug methods
  debugCurrentState() {
    console.log('\n🐛 === CURRENT DEBUG STATE ===');
    
    console.log('📍 Item Locations:');
    this.itemTracker.forEach((gridId, itemId) => {
      console.log(`  ${itemId} → ${gridId}`);
    });
    
    console.log('\n🏗️ Grid Instances:');
    this.gridInstances.forEach((grid, gridId) => {
      console.log(`  Grid "${gridId}": ${grid.engine.nodes.length} items`);
      grid.engine.nodes.forEach(node => {
        console.log(`    ${node.id}: x=${node.x}, y=${node.y}, w=${node.w}, h=${node.h}`);
      });
    });
    
    console.log('\n💾 Saved Layout:');
    console.log(JSON.stringify(this.current_layout_data[0]?.layout_json_temp, null, 2));
  }

  debugCoordinatesForItem(itemId: string) {
    const gridId = this.itemTracker.get(itemId);
    if (!gridId) {
      console.log(`❌ Item "${itemId}" not found in tracker`);
      return;
    }
    
    const grid = this.gridInstances.get(gridId);
    if (!grid) {
      console.log(`❌ Grid "${gridId}" not found`);
      return;
    }
    
    const node = grid.engine.nodes.find(n => n.id === itemId);
    if (!node) {
      console.log(`❌ Item "${itemId}" not found in grid "${gridId}"`);
      return;
    }
    
    console.log(`\n🎯 Coordinates for item "${itemId}" in grid "${gridId}":`, {
      x: node.x,  // Column position (0 to grid.column-1)
      y: node.y,  // Row position (0+)
      w: node.w,  // Width in columns
      h: node.h,  // Height in rows
      gridColumns: grid.getColumn(),
      inBounds: node.x >= 0 && node.x < grid.getColumn() && node.x + node.w <= grid.getColumn()
    });
  }
}

// 🚀 USAGE EXAMPLE
/*
const gridExample = new GridStackCoordinateExample();
gridExample.initializeWithCorrectCoordinates();

// Debug tools (add to window for testing)
window.debugGrid = () => gridExample.debugCurrentState();
window.debugItem = (itemId) => gridExample.debugCoordinatesForItem(itemId);

// Example: Check coordinates for specific item
// debugItem('widget-1');
// debugGrid();
*/

export { GridStackCoordinateExample };