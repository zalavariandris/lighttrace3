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

- [ ] implement raytracing on the CPU for svg viewport
- [ ] physically accurate BSDFs. eg dielectric relfection.
- [ ] physically accurate wavelength to color wavelength->XYZ->linearRGB->sRGB
- [ ] add reinhardt tonemapping and exposure (handle linear RGB to sRGB covnersion here)
- [ ] progressive rendering
- [ ] add linesegment shape

### UI/UX
- [ ] mousetools to create and delete objects
- [ ] persistent scene
- [ ] implement settings
- [ ] persistent settings
- [ ] fix ugly sidebars
- [ ] fix ugly manipulators
- [ ] direction light width manip is a bit strange. should act on the axis only not by distance


## fix bugs
- [ ] lens intersect ouside iof diemeter, when edge thickness is greater then zero
- [ ] fix GLRaytracer memory leak?