## TODOs
- [x] light temperature
- [x] support wavelength and dispersion

- [x] support multiple lights
- [x] support different light types: Point, Laser, Directional, Spot?
- [x] support different shapes: Rectangle, Spherical Lens
- [x] support rotation transform
- [x] support multiple materials for each shape
- [x] add transform manipulators for all.
- [x] implement shape manipulators
- [x] randomize diffuse bounce

- [x] select shapes with mouse click
- [x] Inspector for selected object's transform, shape and material components
- [x] select lights
- [x] light inspector
- [x] manip for directional light width
- [x] add reinhardt tonemapping and exposure (handle linear RGB to sRGB covnersion here)
- [x] progressive rendering
- [x] implement raytracing on the CPU for svg viewport
- [x] physically accurate BSDFs. eg dielectric relfection.
- [x] add linesegment shape
- [x] add prism shape

- [ ] support dispersion in svg-raytracer
- [ ] physically accurate wavelength to color wavelength->XYZ->linearRGB->sRGB
- [ ] review tonemapping. support multiple colorspaces

### UI/UX
- [ ] align ui group attributes to each group. add grid to a parent element, and make groups a child of this form.
- [x] mousetools to create and delete objects
- [ ] show when lights are selected. selection shape is too small? hard to select
- [x] persistent scene
- [x] persistent settings
- [ ] persistent viewbox
- [ ] reset persistent stores
- [ ] handle errors in components. eg raytracing errors in SVGRaytracer component
- [x] implement settings

- [ ] fix ugly sidebars
- [ ] fix ugly manipulators
- [ ] direction light width manip is a bit strange. should act on the axis only not by distance

## fix bugs
- [ ] refacto mousetools (eg. react component)
- [ ] lens intersect outside iof diemeter, when edge thickness is greater then zero
- [ ] fix GLRaytracer memory leak?
- [ ] when sampling lights handle nonexistent type in svg- and g-raytracer
- [ ] fix SVGRaytracer interacting with a rectangle.