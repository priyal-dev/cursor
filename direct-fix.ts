// DIRECT FIX: Use changed items from event, not grid.engine.nodes

class YourExistingClass {
  grid: GridStack;
  current_layout_data: any[] = [];
  private gridInstances: Map<string, GridStack> = new Map();

  initializeGrid() {
    this.grid = GridStack.init({
      column: 8,
      removable: '#trash',
      acceptWidgets: true,
      float: false,
      resizable: { handles: 'se,e,s,sw,w' }
    });

    this.gridInstances.set('main', this.grid);

    GridStack.renderCB = (el: HTMLElement, w: GridStackNode) => {
      if (w.content) {
        el.innerHTML = w.content;
      }
    };

    // CRITICAL FIX: Use the changed items directly from the event
    this.grid.on('change', (event: Event, items: GridStackNode[]) => {
      console.log('Changed items:', items); // These have CORRECT positions
      this.updateLayoutWithChangedItems(items, 'main');
    });

    // Track nested grids
    this.grid.on('added', (event: Event, items: GridStackNode[]) => {
      items.forEach(item => {
        if (item.subGrid && item.id) {
          this.registerNestedGrid(item.subGrid, item.id);
        }
      });
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

  registerNestedGrid(subGrid: GridStack, parentId: string) {
    this.gridInstances.set(parentId, subGrid);
    
    // CRITICAL: Handle changes in nested grids
    subGrid.on('change', (event: Event, items: GridStackNode[]) => {
      console.log(`Nested grid ${parentId} changed items:`, items);
      this.updateLayoutWithChangedItems(items, parentId);
    });

    subGrid.on('added', (event: Event, items: GridStackNode[]) => {
      items.forEach(item => {
        if (item.subGrid && item.id) {
          this.registerNestedGrid(item.subGrid, `${parentId}-${item.id}`);
        }
      });
    });
  }

  registerExistingNestedGrids() {
    this.grid.engine.nodes.forEach(node => {
      if (node.subGrid && node.id) {
        this.registerNestedGrid(node.subGrid, node.id);
      }
    });
  }

  // MAIN FIX: Update only the items that actually changed
  updateLayoutWithChangedItems(changedItems: GridStackNode[], gridId: string) {
    const layout = this.current_layout_data[0]?.layout_json_temp;
    if (!layout || !layout.children) {
      console.log('No layout to update');
      return;
    }

    // Find and update the specific items that changed
    const updated = this.updateItemsInLayout(layout.children, changedItems, gridId, 'main');
    
    if (updated) {
      this.current_layout_data[0].layout_json_temp = layout;
      console.log('Layout updated successfully');
    } else {
      console.log('Items not found in layout - may be in nested grid');
    }
  }

  // Recursively find and update items in the layout structure
  updateItemsInLayout(children: any[], changedItems: GridStackNode[], targetGridId: string, currentGridId: string): boolean {
    let foundAndUpdated = false;

    if (currentGridId === targetGridId) {
      // We're in the right grid - update the changed items
      changedItems.forEach(changedItem => {
        const existingItem = children.find(child => child.id === changedItem.id);
        if (existingItem) {
          // CRITICAL: Use the CORRECT positions from the change event
          existingItem.x = changedItem.x;  // ✅ Correct position
          existingItem.y = changedItem.y;  // ✅ Correct position
          existingItem.w = changedItem.w;  // ✅ Correct width
          existingItem.h = changedItem.h;  // ✅ Correct height
          
          // Preserve content
          if (changedItem.content) {
            existingItem.content = changedItem.content;
          }
          
          console.log(`✅ Updated ${changedItem.id}:`, {
            x: changedItem.x, y: changedItem.y, w: changedItem.w, h: changedItem.h
          });
          
          foundAndUpdated = true;
        } else {
          console.log(`⚠️ Item ${changedItem.id} not found in grid ${targetGridId}`);
        }
      });
    } else {
      // Search in nested grids
      children.forEach(child => {
        if (child.subGridOpts?.children) {
          const nestedGridId = currentGridId === 'main' ? child.id : `${currentGridId}-${child.id}`;
          if (this.updateItemsInLayout(child.subGridOpts.children, changedItems, targetGridId, nestedGridId)) {
            foundAndUpdated = true;
          }
        }
      });
    }

    return foundAndUpdated;
  }

  // Alternative: Direct replacement method - use this if the above doesn't work
  updateLayoutDirect(changedItems: GridStackNode[], gridId: string) {
    // Get the current saved layout
    let layout = this.current_layout_data[0]?.layout_json_temp;
    
    if (!layout) {
      // If no layout exists, create one from current state but use changed items for positions
      layout = this.createLayoutFromCurrentState();
    }

    // Update only the specific changed items
    this.updateSpecificItems(layout, changedItems, gridId);
    
    // Save back
    this.current_layout_data[0].layout_json_temp = layout;
  }

  updateSpecificItems(layout: any, changedItems: GridStackNode[], gridId: string) {
    const traverse = (children: any[], currentPath: string) => {
      if (currentPath === gridId) {
        // Update items at this level
        changedItems.forEach(item => {
          const found = children.find(child => child.id === item.id);
          if (found) {
            found.x = item.x;  // Correct from change event
            found.y = item.y;  // Correct from change event
            found.w = item.w;  // Correct from change event
            found.h = item.h;  // Correct from change event
            if (item.content) found.content = item.content;
          }
        });
        return;
      }

      // Traverse nested grids
      children?.forEach(child => {
        if (child.subGridOpts?.children) {
          const nestedPath = currentPath === 'main' ? child.id : `${currentPath}-${child.id}`;
          traverse(child.subGridOpts.children, nestedPath);
        }
      });
    };

    traverse(layout.children || [], 'main');
  }

  createLayoutFromCurrentState(): any {
    // Fallback: create layout from current grid state
    return {
      children: this.extractNodes(this.grid, 'main')
    };
  }

  extractNodes(grid: GridStack, gridId: string): any[] {
    return grid.engine.nodes.map(node => {
      const nodeData = {
        id: node.id,
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        content: node.content
      };

      if (node.subGrid) {
        nodeData.subGridOpts = {
          children: this.extractNodes(node.subGrid, node.id)
        };
      }

      return nodeData;
    });
  }

  // Debug method
  debugChanges(changedItems: GridStackNode[], gridId: string) {
    console.log(`=== Debug Changes in ${gridId} ===`);
    changedItems.forEach(item => {
      console.log(`Item ${item.id}:`, {
        fromEvent: { x: item.x, y: item.y, w: item.w, h: item.h },
        content: !!item.content
      });

      // Compare with what's in grid.engine
      const grid = this.gridInstances.get(gridId);
      if (grid) {
        const engineNode = grid.engine.nodes.find(n => n.id === item.id);
        if (engineNode) {
          console.log(`In engine:`, {
            x: engineNode.x, y: engineNode.y, w: engineNode.w, h: engineNode.h
          });
          console.log(`Match:`, item.x === engineNode.x && item.y === engineNode.y);
        }
      }
    });
  }
}

// SIMPLE USAGE EXAMPLE:
/*
// Replace your existing change handler with this:

this.grid.on('change', (event: Event, items: GridStackNode[]) => {
  // items parameter contains the CORRECT positions!
  console.log('Items with correct positions:', items);
  
  // Option 1: Use the direct method
  this.updateLayoutWithChangedItems(items, 'main');
  
  // Option 2: Use alternative method if option 1 doesn't work
  // this.updateLayoutDirect(items, 'main');
  
  // Debug to see what we got
  // this.debugChanges(items, 'main');
});
*/