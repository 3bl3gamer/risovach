Risovach
========

Paint(canvas, opts):
 * buffer (ro)
 * getLayerBuffer([id]) (current if no id)
 * layer_numb (ro)
 * layer_id
 * forEachLayer(func(i, buffer))
 * toolAdd(name, obj)
 * toolSet(name)
 * toolUsePrevious()
 * undo()
 * redo()
 * redoAll(forceLayer)
 * history
 * applyBuffer()
for internal use (with tools etc.)
 * refresh(mouse_x,mouse_y)
 * refreshRegion(x,y,w,h,mouse_x,mouse_y)
 * refreshRegionCoords(x0,y0,x1,y1, mouse_x,mouse_y)
 * refreshRegionCoordsRadius(x0,y0,x1,y1,r, mouse_x,mouse_y)
 * refreshRect
 * tryToUpdate(mouse_x,mouse_y)
 * SimpleEventWrapper
opts
 * layer_numb (optional, 4 default)
 * wacom_plugin (optional)
 * onLayerChange (optional)

History(paint):
 * action ("none" || "undo" || "redo")
 * add(newStep)
 * unshift()
 * undo()
 * redo(forceLayer)

Tool(paint):
* events
* blendMode (get)*
* cursor{img, xo, yo}*

HistoryStep(paint, tool, ...):
* capture(paint, [force_layer_id])
* undo(paint)
* redo(paint)
