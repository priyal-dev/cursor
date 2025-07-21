// QUICK FIX - Replace these parts in your existing code:

// 1. ADD this property to your class:
// private gridInstances: Map<string, GridStack> = new Map();

// 2. REPLACE your grid initialization with this:
function initializeYourGrid() {
  this.grid = GridStack.init({
    column: 8,
    removable: '#trash',
    acceptWidgets: true,
    float: false,
    resizable: { handles: 'se,e,s,sw,w' }
  });

  // ADD: Track main grid
  this.gridInstances.set('main', this.grid);

  // ADD: Track nested grids
  this.grid.on('added', (event: Event, items: GridStackNode[]) => {
    items.forEach(item => {
      if (item.subGrid && item.id) {
        this.gridInstances.set(item.id, item.subGrid);
        // Set up change listener for nested grid
        item.subGrid.on('change', () => {
          this.saveCurrentLayout();
        });
      }
    });
  });

  GridStack.renderCB = (el: HTMLElement, w: GridStackNode) => {
    if (w.content) {
      el.innerHTML = w.content;
    }
  };

  // REPLACE your existing change event with this:
  this.grid.on('change', () => {
    this.saveCurrentLayout();
  });

  // Your existing layout loading...
  this.grid = GridStack.addGrid(
    document.querySelector('.container-fluid'),
    this.current_layout_data[0]?.layout_json_temp
  );
}

// 3. REPLACE your change event handler with this method:
function saveCurrentLayout() {
  const correctedLayout = this.getCorrectPositions();
  this.current_layout_data[0].layout_json_temp = correctedLayout;
}

// 4. REPLACE your updateNodePositions method with this:
function getCorrectPositions(): any {
  const baseData = this.grid.save(false, false); // Don't include nested grids
  return this.fixPositionsRecursively(this.grid, baseData);
}

// 5. ADD this new method:
function fixPositionsRecursively(grid: GridStack, data: any): any {
  const fixedChildren = data.children?.map((child: any) => {
    // Get real current position from grid engine
    const realNode = grid.engine.nodes.find(n => n.id === child.id);
    
    if (realNode) {
      const fixed = {
        ...child,
        x: realNode.x,        // Real X position
        y: realNode.y,        // Real Y position
        w: realNode.w,        // Real width
        h: realNode.h,        // Real height
        content: realNode.content || child.content  // Keep content
      };

      // Fix nested grids too
      if (realNode.subGrid) {
        const nestedData = realNode.subGrid.save(false, false);
        fixed.subGridOpts = this.fixPositionsRecursively(realNode.subGrid, nestedData);
      }

      return fixed;
    }
    return child;
  }) || [];

  return { ...data, children: fixedChildren };
}

// 6. DELETE your old updateNodePositions method entirely

/*
// OLD METHOD - DELETE THIS:
updateNodePositions(grid: GridStack, savedItems: any) {
  // Remove this entire method
}
*/

// 7. OPTIONAL: Add this debug method to test:
function debugPositions() {
  console.log('=== Current Positions ===');
  console.log('Main grid:', this.grid.engine.nodes);
  this.gridInstances.forEach((subGrid, id) => {
    if (id !== 'main') {
      console.log(`Nested ${id}:`, subGrid.engine.nodes);
    }
  });
}