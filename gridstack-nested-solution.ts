interface GridStackSolution {
  grid: GridStack;
  current_layout_data: any[];
  gridInstances: Map<string, GridStack>;
}

class GridStackNestedSolution implements GridStackSolution {
  grid: GridStack;
  current_layout_data: any[] = [];
  gridInstances: Map<string, GridStack> = new Map();

  constructor() {
    this.initializeGridStack();
  }

  initializeGridStack() {
    // Initialize main grid
    this.grid = GridStack.init({
      column: 8,
      removable: '#trash',
      acceptWidgets: true,
      float: false,
      resizable: { handles: 'se,e,s,sw,w' },
      // Important: Enable proper nested grid support
      subGridOpts: {
        acceptWidgets: true,
        column: 8,
        float: false
      }
    });

    // Store main grid instance
    this.gridInstances.set('main', this.grid);

    // Set up custom render callback
    GridStack.renderCB = (el: HTMLElement, w: GridStackNode) => {
      if (w.content) {
        el.innerHTML = w.content;
      }
    };

    // Set up event listeners
    this.setupEventListeners();

    // Load initial layout if exists
    if (this.current_layout_data[0]?.layout_json_temp) {
      this.loadLayout(this.current_layout_data[0].layout_json_temp);
    }
  }

  setupEventListeners() {
    // Main grid change event
    this.grid.on('change', (event: Event, items: GridStackNode[]) => {
      this.handleGridChange(this.grid, items, 'main');
    });

    // Listen for added/removed events to track nested grids
    this.grid.on('added', (event: Event, items: GridStackNode[]) => {
      items.forEach(item => {
        if (item.subGrid) {
          this.registerNestedGrid(item.subGrid, item.id!);
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

  registerNestedGrid(subGrid: GridStack, parentId: string) {
    // Store nested grid instance
    this.gridInstances.set(parentId, subGrid);

    // Set up event listener for nested grid
    subGrid.on('change', (event: Event, items: GridStackNode[]) => {
      this.handleGridChange(subGrid, items, parentId);
    });

    // Handle nested grids within this nested grid
    subGrid.on('added', (event: Event, items: GridStackNode[]) => {
      items.forEach(item => {
        if (item.subGrid) {
          this.registerNestedGrid(item.subGrid, `${parentId}-${item.id}`);
        }
      });
    });
  }

  handleGridChange(grid: GridStack, items: GridStackNode[], gridId: string) {
    console.log(`Grid change detected in: ${gridId}`, items);
    
    // Save the complete layout with correct positions
    const completeLayout = this.saveCompleteLayout();
    
    // Update the stored layout
    this.current_layout_data[0] = {
      ...this.current_layout_data[0],
      layout_json_temp: completeLayout
    };

    console.log('Updated layout:', completeLayout);
  }

  saveCompleteLayout(): any {
    // Start with the main grid
    const mainGridData = this.grid.save(false, false); // Don't save nested grids automatically
    
    // Manually process each node to ensure correct positioning
    const processedData = this.processGridNodes(this.grid, mainGridData);
    
    return processedData;
  }

  processGridNodes(grid: GridStack, gridData: any): any {
    const processedChildren = gridData.children?.map((child: any) => {
      // Find the actual node in the grid engine
      const actualNode = grid.engine.nodes.find(node => node.id === child.id);
      
      if (actualNode) {
        // Use actual positions from the grid engine
        const processedChild = {
          ...child,
          x: actualNode.x,
          y: actualNode.y,
          w: actualNode.w,
          h: actualNode.h,
          content: actualNode.content || child.content // Preserve content
        };

        // Handle nested grids
        if (actualNode.subGrid) {
          const nestedGridData = actualNode.subGrid.save(false, false);
          processedChild.subGridOpts = this.processGridNodes(actualNode.subGrid, nestedGridData);
        }

        return processedChild;
      }
      
      return child;
    }) || [];

    return {
      ...gridData,
      children: processedChildren
    };
  }

  // Alternative method using direct node tracking
  saveLayoutWithDirectTracking(): any {
    const layout = {
      children: this.extractNodesRecursively(this.grid)
    };
    
    return layout;
  }

  extractNodesRecursively(grid: GridStack): any[] {
    return grid.engine.nodes.map(node => {
      const nodeData = {
        id: node.id,
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        content: node.content,
        // Preserve other properties
        ...(node as any)._dirty && { _dirty: true },
        ...(node as any).noResize && { noResize: true },
        ...(node as any).noMove && { noMove: true }
      };

      // Handle nested grids
      if (node.subGrid) {
        nodeData.subGridOpts = {
          children: this.extractNodesRecursively(node.subGrid)
        };
      }

      return nodeData;
    });
  }

  loadLayout(layoutData: any) {
    try {
      // Clear existing grid
      this.grid.removeAll();
      
      // Load the layout
      this.grid.load(layoutData.children || layoutData, true);
      
      // Register any nested grids that were created
      this.registerAllNestedGrids();
      
    } catch (error) {
      console.error('Error loading layout:', error);
    }
  }

  registerAllNestedGrids() {
    this.grid.engine.nodes.forEach(node => {
      if (node.subGrid && node.id) {
        this.registerNestedGrid(node.subGrid, node.id);
      }
    });
  }

  // Method to manually trigger position update
  updateAllPositions() {
    const layout = this.saveCompleteLayout();
    this.current_layout_data[0] = {
      ...this.current_layout_data[0],
      layout_json_temp: layout
    };
    return layout;
  }

  // Debug method to log all grid states
  debugGridStates() {
    console.log('=== Grid Debug Info ===');
    console.log('Main grid nodes:', this.grid.engine.nodes);
    
    this.gridInstances.forEach((grid, id) => {
      console.log(`Grid ${id} nodes:`, grid.engine.nodes);
    });
    
    console.log('Current layout data:', this.current_layout_data[0]?.layout_json_temp);
  }

  // Method to fix content issues
  fixContentIssues() {
    this.grid.engine.nodes.forEach(node => {
      const el = node.el;
      if (el && !el.innerHTML && node.content) {
        el.innerHTML = node.content;
      }
    });

    // Fix nested grids content
    this.gridInstances.forEach(grid => {
      grid.engine.nodes.forEach(node => {
        const el = node.el;
        if (el && !el.innerHTML && node.content) {
          el.innerHTML = node.content;
        }
      });
    });
  }
}

// Usage example
const gridSolution = new GridStackNestedSolution();

// Event handlers for debugging
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'd') {
    e.preventDefault();
    gridSolution.debugGridStates();
  }
  
  if (e.ctrlKey && e.key === 'f') {
    e.preventDefault();
    gridSolution.fixContentIssues();
  }
});

// Export for use in other modules
export { GridStackNestedSolution };