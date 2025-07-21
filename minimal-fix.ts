// MINIMAL FIX: Replace your existing updateNodePositions method with this improved version

class YourExistingClass {
  grid: GridStack;
  current_layout_data: any[] = [];
  private gridInstances: Map<string, GridStack> = new Map();

  // Your existing initialization code, but add this after grid creation:
  initializeGrid() {
    this.grid = GridStack.init({
      column: 8,
      removable: '#trash',
      acceptWidgets: true,
      float: false,
      resizable: { handles: 'se,e,s,sw,w' }
    });

    // CRITICAL: Register the main grid
    this.gridInstances.set('main', this.grid);

    // CRITICAL: Set up nested grid tracking
    this.setupNestedGridTracking();

    GridStack.renderCB = (el: HTMLElement, w: GridStackNode) => {
      if (w.content) {
        el.innerHTML = w.content;
      }
    };

    // Replace your existing change event with this improved version:
    this.grid.on('change', (event: Event, items: GridStackNode[]) => {
      const gridData = this.saveGridWithCorrectPositions();
      this.current_layout_data[0].layout_json_temp = gridData;
    });

    // Load your existing layout
    if (this.current_layout_data[0]?.layout_json_temp) {
      this.grid = GridStack.addGrid(
        document.querySelector('.container-fluid'),
        this.current_layout_data[0]?.layout_json_temp
      );
      this.registerExistingNestedGrids();
    }
  }

  // NEW METHOD: Track nested grids properly
  setupNestedGridTracking() {
    this.grid.on('added', (event: Event, items: GridStackNode[]) => {
      items.forEach(item => {
        if (item.subGrid && item.id) {
          this.registerNestedGrid(item.subGrid, item.id);
        }
      });
    });

    this.grid.on('removed', (event: Event, items: GridStackNode[]) => {
      items.forEach(item => {
        if (item.id && this.gridInstances.has(item.id)) {
          this.gridInstances.delete(item.id);
        }
      });
    });
  }

  // NEW METHOD: Register nested grids with their own change events
  registerNestedGrid(subGrid: GridStack, parentId: string) {
    this.gridInstances.set(parentId, subGrid);
    
    // CRITICAL: Each nested grid needs its own change handler
    subGrid.on('change', (event: Event, items: GridStackNode[]) => {
      const gridData = this.saveGridWithCorrectPositions();
      this.current_layout_data[0].layout_json_temp = gridData;
    });

    // Handle deeply nested grids
    subGrid.on('added', (event: Event, items: GridStackNode[]) => {
      items.forEach(item => {
        if (item.subGrid && item.id) {
          this.registerNestedGrid(item.subGrid, `${parentId}-${item.id}`);
        }
      });
    });
  }

  // NEW METHOD: Register existing nested grids after loading
  registerExistingNestedGrids() {
    this.grid.engine.nodes.forEach(node => {
      if (node.subGrid && node.id) {
        this.registerNestedGrid(node.subGrid, node.id);
      }
    });
  }

  // IMPROVED METHOD: Replace your updateNodePositions with this
  saveGridWithCorrectPositions(): any {
    // Use save() without nested grids, then process manually
    const baseData = this.grid.save(false, false);
    
    // Process all nodes recursively with correct positions
    return this.processAllNodes(this.grid, baseData);
  }

  // NEW METHOD: Process nodes with correct positions and content
  processAllNodes(grid: GridStack, gridData: any): any {
    const correctedChildren = gridData.children?.map((savedChild: any) => {
      // Find the actual current node in the grid engine
      const actualNode = grid.engine.nodes.find(node => node.id === savedChild.id);
      
      if (actualNode) {
        // CRITICAL: Use actual positions from grid engine, not from save()
        const correctedChild = {
          ...savedChild,
          x: actualNode.x,  // Real position
          y: actualNode.y,  // Real position  
          w: actualNode.w,  // Real width
          h: actualNode.h,  // Real height
          content: actualNode.content || savedChild.content, // Preserve content
          // Preserve other important properties
          id: actualNode.id,
          noResize: actualNode.noResize,
          noMove: actualNode.noMove
        };

        // CRITICAL: Handle nested grids recursively
        if (actualNode.subGrid) {
          const nestedData = actualNode.subGrid.save(false, false);
          correctedChild.subGridOpts = this.processAllNodes(actualNode.subGrid, nestedData);
        }

        return correctedChild;
      }

      // If node not found in engine, return as-is (shouldn't happen)
      return savedChild;
    }) || [];

    return {
      ...gridData,
      children: correctedChildren
    };
  }

  // DEPRECATED: Remove your old updateNodePositions method
  // updateNodePositions(grid: GridStack, savedItems: any) {
  //   // This method had issues - replace with saveGridWithCorrectPositions()
  // }

  // UTILITY METHOD: Fix content issues if they occur
  fixContentIssues() {
    // Fix main grid content
    this.grid.engine.nodes.forEach(node => {
      if (node.el && !node.el.innerHTML && node.content) {
        node.el.innerHTML = node.content;
      }
    });

    // Fix nested grids content
    this.gridInstances.forEach(subGrid => {
      subGrid.engine.nodes.forEach(node => {
        if (node.el && !node.el.innerHTML && node.content) {
          node.el.innerHTML = node.content;
        }
      });
    });
  }

  // DEBUG METHOD: Log current state for debugging
  debugCurrentState() {
    console.log('=== DEBUG: Current Grid State ===');
    console.log('Main grid nodes:', this.grid.engine.nodes.map(n => ({
      id: n.id, x: n.x, y: n.y, w: n.w, h: n.h, content: !!n.content
    })));
    
    this.gridInstances.forEach((subGrid, id) => {
      if (id !== 'main') {
        console.log(`Nested grid ${id} nodes:`, subGrid.engine.nodes.map(n => ({
          id: n.id, x: n.x, y: n.y, w: n.w, h: n.h, content: !!n.content
        })));
      }
    });

    console.log('Saved layout:', this.current_layout_data[0]?.layout_json_temp);
  }
}

// EXAMPLE USAGE:
// Replace your existing initialization with:
/*
const yourClass = new YourExistingClass();
yourClass.initializeGrid();

// Debug shortcuts (remove in production)
window.debugGrid = () => yourClass.debugCurrentState();
window.fixContent = () => yourClass.fixContentIssues();
*/