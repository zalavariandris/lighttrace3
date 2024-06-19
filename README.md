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
- [x] refactor svg viewport. Use child elements, to map entities to their own elements.


### UI/UX
- [x] align ui group attributes to each group.
- [x] mousetools to create and delete objects
- [x] show when lights are selected. selection shape is too small? hard to select
- [x] persistent scene
- [x] persistent settings
- [x] implement settings
- [x] fix ugly sidebars
- [x] fix ugly manipulators
- [x] remove coreui

## fix bugs
- [x] persistent viewbox
- [x] stop gl rendering when hidden
- [x] circle size handler is usable even when not selected...
- [x] with the new SVG Ratracer hitLines has problams when included in a scene.
      Any objects in the back, were messing up the hitrays. did not affect raytracing
- [/] handle errors in components. eg.: raytracing errors in SVGRaytracer component

- SVG Raytracer
  - [x] fix svg raytracer.
  - [x] fix SVGRaytracer interacting with a rectangle.
  - [x] support dispersion in svg-raytracer?
  - [ ] support colored lines
  - [ ] Since SVG raytracing uses random numbers, its flickering. Add a uniform random number to diffuse sampling, or a random number with seed.

- WebGL raytracer
  - [x] rasterize bias: fix ray energy uniform in all direction
  - [x] fix convex lens rayrtacing in webgl raytracer
  - [x] lens intersect outside of diemeter, when edge thickness is greater then zero
  - [x] HOW TO REPRESENT No HitInfo and No Intersection SPAN? eg.: valid field, or tNear> tFar. The later could be automatic in several situation, but less readable.: IsValidSpan function chacks if tNear is greater than tFar
  - [x] random rays seem to be on the same place. Review generating random numbers. random numbers generater was ok. The blackbody sampling returned discreet
  - [x] distrubute lightSamples among all lights (based on intensity)
  - [x] review data texture types.
        all fbo attachment must have the same format (bitsize).
  - [x] review postprocessing. e.g.: support multiple colorspaces. refactor tonemapping, exposure and accumulate
  - [ ] physically accurate wavelength to color wavelength->XYZ->linearRGB->sRGB
  - [ ] refactor glviewport to map entities to its internal data (eg initialrays array, transformArray, shapes Array materialsArray...)
  - [ ] check if GLRaytracer leaks memory?
  - [x] fix accumulate makes final intensity stronger


- [ ] Mobile support (ipad, iphone, android?, safari, chrome)
  - [ ] webgl support check (eg.: gl extension)



- Interaction
  - [ ] scaling a circle or a rectangle jumps to mouse.
  - [x] direction light width manip is a bit strange. should act on the axis only not by distance
  - [ ] refactor mousetools (eg. react component)
  - [ ] mobile support
  - [ ] review manipulators
    - manupilator size should be independent of the zoom level
    - corner and rotation manips should work on the cornsers or edges as well. Keep tha manipulators for new users.

- UI
  - [x] when window is narrow, the bottom bar buttons are not visible. break lines at categories if necessary


# The code
## gl-raytracer

- rayDataTexture:
  XY: ray.origin
  ZW: ray direction (normalized)