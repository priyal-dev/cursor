// CORRECT SOLUTION: Track changed items and use their correct positions

class GridStackCorrectChangeTracking {
  grid: GridStack;
  current_layout_data: any[] = [];
  private gridInstances: Map<string, GridStack> = new Map();
  private lastKnownPositions: Map<string, any> = new Map(); // Track last known good positions

  initializeGrid() {
    this.grid = GridStack.init({
      column: 8,
      removable: '#trash',
      acceptWidgets: true,
      float: false,
      resizable: { handles: 'se,e,s,sw,w' }
    });

    this.gridInstances.set('main', this.grid);
    this.setupChangeTracking();

    GridStack.renderCB = (el: HTMLElement, w: GridStackNode) => {
      if (w.content) {
        el.innerHTML = w.content;
      }
    };

    // Load existing layout
    if (this.current_layout_data[0]?.layout_json_temp) {
      this.grid = GridStack.addGrid(
        document.querySelector('.container-fluid'),
        this.current_layout_data[0]?.layout_json_temp
      );
      this.initializeLastKnownPositions();
      this.registerExistingNestedGrids();
    }
  }

  setupChangeTracking() {
    // CRITICAL: Use the changed items from the event, not grid.engine.nodes
    this.grid.on('change', (event: Event, items: GridStackNode[]) => {
      console.log('Main grid change detected:', items);
      this.handleItemsChanged(items, 'main');
    });

    // Track when nested grids are added
    this.grid.on('added', (event: Event, items: GridStackNode[]) => {
      items.forEach(item => {
        if (item.subGrid && item.id) {
          this.registerNestedGrid(item.subGrid, item.id);
        }
        // Update last known positions for added items
        if (item.id) {
          this.lastKnownPositions.set(item.id, {
            x: item.x, y: item.y, w: item.w, h: item.h, content: item.content
          });
        }
      });
    });

    this.grid.on('removed', (event: Event, items: GridStackNode[]) => {
      items.forEach(item => {
        if (item.id) {
          this.lastKnownPositions.delete(item.id);
          if (this.gridInstances.has(item.id)) {
            this.gridInstances.delete(item.id);
          }
        }
      });
    });
  }

  registerNestedGrid(subGrid: GridStack, parentId: string) {
    this.gridInstances.set(parentId, subGrid);
    
    // CRITICAL: Track changes in nested grids with correct positions
    subGrid.on('change', (event: Event, items: GridStackNode[]) => {
      console.log(`Nested grid ${parentId} change detected:`, items);
      this.handleItemsChanged(items, parentId);
    });

    subGrid.on('added', (event: Event, items: GridStackNode[]) => {
      items.forEach(item => {
        if (item.subGrid && item.id) {
          this.registerNestedGrid(item.subGrid, `${parentId}-${item.id}`);
        }
        if (item.id) {
          this.lastKnownPositions.set(`${parentId}-${item.id}`, {
            x: item.x, y: item.y, w: item.w, h: item.h, content: item.content
          });
        }
      });
    });

    subGrid.on('removed', (event: Event, items: GridStackNode[]) => {
      items.forEach(item => {
        if (item.id) {
          this.lastKnownPositions.delete(`${parentId}-${item.id}`);
        }
      });
    });
  }

  // CRITICAL: Handle the specific items that changed
  handleItemsChanged(changedItems: GridStackNode[], gridId: string) {
    // Update last known positions with the CORRECT positions from change event
    changedItems.forEach(item => {
      if (item.id) {
        const key = gridId === 'main' ? item.id : `${gridId}-${item.id}`;
        this.lastKnownPositions.set(key, {
          x: item.x,        // These are CORRECT from change event
          y: item.y,        // These are CORRECT from change event
          w: item.w,        // These are CORRECT from change event
          h: item.h,        // These are CORRECT from change event
          content: item.content || this.lastKnownPositions.get(key)?.content
        });
        
        console.log(`Updated position for ${item.id}:`, { x: item.x, y: item.y, w: item.w, h: item.h });
      }
    });

    // Now rebuild the complete layout using last known good positions
    this.saveLayoutWithCorrectPositions();
  }

  saveLayoutWithCorrectPositions() {
    const layout = this.buildLayoutFromLastKnownPositions();
    this.current_layout_data[0] = {
      ...this.current_layout_data[0],
      layout_json_temp: layout
    };
    
    console.log('Updated layout with correct positions:', layout);
  }

  buildLayoutFromLastKnownPositions(): any {
    return {
      children: this.buildChildrenFromPositions(this.grid, 'main')
    };
  }

  buildChildrenFromPositions(grid: GridStack, gridId: string): any[] {
    return grid.engine.nodes.map(node => {
      const key = gridId === 'main' ? node.id : `${gridId}-${node.id}`;
      const knownPosition = this.lastKnownPositions.get(key);
      
      // Use last known correct position, fallback to current node data
      const nodeData = {
        id: node.id,
        x: knownPosition?.x ?? node.x,
        y: knownPosition?.y ?? node.y,
        w: knownPosition?.w ?? node.w,
        h: knownPosition?.h ?? node.h,
        content: knownPosition?.content ?? node.content,
        // Preserve other properties
        ...(node.noResize && { noResize: node.noResize }),
        ...(node.noMove && { noMove: node.noMove })
      };

      // Handle nested grids recursively
      if (node.subGrid) {
        nodeData.subGridOpts = {
          children: this.buildChildrenFromPositions(node.subGrid, key)
        };
      }

      return nodeData;
    });
  }

  initializeLastKnownPositions() {
    // Initialize positions from loaded layout
    const traverseNodes = (nodes: any[], prefix: string = '') => {
      nodes?.forEach(node => {
        if (node.id) {
          const key = prefix ? `${prefix}-${node.id}` : node.id;
          this.lastKnownPositions.set(key, {
            x: node.x, y: node.y, w: node.w, h: node.h, content: node.content
          });
        }
        
        if (node.subGridOpts?.children) {
          traverseNodes(node.subGridOpts.children, key);
        }
      });
    };

    traverseNodes(this.current_layout_data[0]?.layout_json_temp?.children);
  }

  registerExistingNestedGrids() {
    const registerRecursively = (grid: GridStack, prefix: string = 'main') => {
      grid.engine.nodes.forEach(node => {
        if (node.subGrid && node.id) {
          const gridKey = prefix === 'main' ? node.id : `${prefix}-${node.id}`;
          this.registerNestedGrid(node.subGrid, gridKey);
          registerRecursively(node.subGrid, gridKey);
        }
      });
    };

    registerRecursively(this.grid);
  }

  // Alternative method: Force update specific items
  updateSpecificItemPositions(changedItems: GridStackNode[], gridId: string) {
    const layout = this.current_layout_data[0]?.layout_json_temp;
    if (!layout) return;

    const updateInChildren = (children: any[], targetGridId: string, currentPath: string = 'main'): boolean => {
      if (currentPath === targetGridId) {
        // Update items in this grid level
        changedItems.forEach(changedItem => {
          const existingItem = children.find(child => child.id === changedItem.id);
          if (existingItem) {
            existingItem.x = changedItem.x;
            existingItem.y = changedItem.y;
            existingItem.w = changedItem.w;
            existingItem.h = changedItem.h;
            if (changedItem.content) {
              existingItem.content = changedItem.content;
            }
            console.log(`Updated item ${changedItem.id} in grid ${targetGridId}:`, 
                       { x: changedItem.x, y: changedItem.y });
          }
        });
        return true;
      }

      // Search in nested grids
      for (const child of children) {
        if (child.subGridOpts?.children) {
          const nestedPath = currentPath === 'main' ? child.id : `${currentPath}-${child.id}`;
          if (updateInChildren(child.subGridOpts.children, targetGridId, nestedPath)) {
            return true;
          }
        }
      }
      return false;
    };

    updateInChildren(layout.children, gridId);
    this.current_layout_data[0].layout_json_temp = layout;
  }

  // Debug method to verify positions
  debugChangedItems(changedItems: GridStackNode[], gridId: string) {
    console.log(`=== Changed Items in ${gridId} ===`);
    changedItems.forEach(item => {
      console.log(`Item ${item.id}:`, {
        x: item.x, y: item.y, w: item.w, h: item.h,
        content: !!item.content
      });
      
      // Compare with grid engine
      const grid = this.gridInstances.get(gridId);
      const engineNode = grid?.engine.nodes.find(n => n.id === item.id);
      if (engineNode) {
        console.log(`Engine has:`, {
          x: engineNode.x, y: engineNode.y, w: engineNode.w, h: engineNode.h
        });
        console.log(`Positions match:`, 
          item.x === engineNode.x && item.y === engineNode.y);
      }
    });
  }
}

// USAGE EXAMPLE:
/*
const gridTracker = new GridStackCorrectChangeTracking();
gridTracker.initializeGrid();

// For debugging - add to window
window.debugGrid = (items, gridId) => gridTracker.debugChangedItems(items, gridId);
*/

export { GridStackCorrectChangeTracking };