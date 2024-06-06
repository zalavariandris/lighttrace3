import * as vec2 from "./math-utils.js"

class HitInfo
{
     constructor(t, x, y, nx, ny, material)
    {
        this.t = t;
        this.x = x;
        this.y = y
        this.nx = nx;
        this.ny = ny
        this.material = material;
    }
}

/**
 * Calculates the closest intersection of a ray with a circle.
 * @param {Ray} ray - The ray object with properties origin and direction.
 * @param {number} cx - The x-coordinate of the circle's center.
 * @param {number} cy - The y-coordinate of the circle's center.
 * @param {number} r - The radius of the circle.
 * @returns {HitInfo} - 
 */
function hitCircle(ray, cx, cy, r)
{
    const ux = ray.x - cx;
    const uy = ray.y - cy;

    const B = vec2.dot([ux, uy], [ray.dx, ray.dy]);
    const C = vec2.dot([ux, uy], [ux, uy]) - r*r;
    const detSq = B*B - C;

    if (detSq >= 0.0)
    {
        const det = Math.sqrt(detSq);
        const tNear = -B - det;
        const tFar  = -B + det;

        // find smallest t
        let t = 9999;
        if(tNear>EPSILON && tNear<(t+EPSILON)) t = tNear;
        if(tFar>EPSILON && tFar<(t+EPSILON)) t = tFar;
        
        const Ix = ray.x+ray.dx*t;
        const Iy = ray.y+ray.dy*t;

        let [Nx, Ny] = vec2.normalize(Ix-cx, Iy-cy);
        
        return new HitInfo(t, Ix, Iy, Nx, Ny, -1);
    }
    else
    {
        return new HitInfo(9999, 0,0, 0,0, -1);
    }
}

const EPSILON = 0.001;

/**
 * Calculates the closest intersection of a ray with a line segment.
 * @param {Ray} ray - The ray object with properties origin and direction.
 * @param {number} x1 - The x-coordinate of P1
 * @param {number} y1 - The y-coordinate of P1
 * @param {number} x2 - The x-coordinate of P2
 * @param {number} y2 - The y-coordinate of P2
 * @returns {HitInfo} - 
 */
function hitLineSegment(ray, x1, y1, x2, y2){
    let result = new HitInfo(9999, ray.x+ray.dx*9999,ray.y+ray.dy*9999, 0,0, -1);

    const tangentX = x2-x1;
    const tangentY = y2-y1;

    // Calculate the determinant
    const determinant = ray.dx * tangentY - ray.dy * tangentX;

    if (Math.abs(determinant) < EPSILON){
        return result;
    }

    // Calculate the intersection along the ray
    const t1 = ((x1 - ray.x) * tangentY - (y1 - ray.y) * tangentX) / determinant;

    // calculate intersection along the line
    const t2 = ((x1 - ray.x) * ray.dy - (y1 - ray.y) * ray.dx) / determinant;
    
    /* check if intersections are in boundary */
    const IntersectionWithinRay = t1>EPSILON;
    const IntersectionWithinLinesegment = t2>EPSILON && t2<(1.0+EPSILON);

    if(IntersectionWithinRay && IntersectionWithinLinesegment)
    {
        const Ix = ray.x+ray.dx*t1;
        const Iy = ray.y+ray.dy*t1;

        let Nx = -tangentY;
        let Ny = tangentX;
        [Nx, Ny] = vec2.normalize(-Nx, -Ny);
        result = new HitInfo(t1, Ix, Iy, Nx, Ny, -1);
    }

    return result;
}

/**
 * Calculates the closest intersection of a ray with a equilateral triangle.
 * @param {Ray} ray - The ray object with properties origin and direction.
 * @param {number} cx - center of triangle
 * @param {number} cy - center of triangle
 * @param {number} angle - triabngle rotation
 * @param {number} size - vertices distance from center
 * @returns {HitInfo} - 
 */
function hitTriangle(ray, cx, cy, angle, size){
    const vertices = Array.from({length:3}).map( (_,k)=>{
        let a = k/3.0*Math.PI*2.0-Math.PI/2.0 + angle;
        return {
            x: Math.cos(a)*size + cx,
            y: Math.sin(a)*size + cy
        };
    });

    // intersect each side
    const hitA = hitLineSegment(ray, vertices[0].x, vertices[0].y, vertices[1].x, vertices[1].y);
    const hitB = hitLineSegment(ray, vertices[1].x, vertices[1].y, vertices[2].x, vertices[2].y);
    const hitC = hitLineSegment(ray, vertices[2].x, vertices[2].y, vertices[0].x, vertices[0].y);

    // find closest intersection
    let hit = hitA;
    if(hitB.t<hit.t) hit = hitB;
    if(hitC.t<hit.t) hit = hitC;
    return hit;
}

/**
 * Calculates the closest intersection of a ray with a rectangle.
 * @param {Ray} ray - The ray object with properties origin and direction.
 * @param {number} cx - center of rectangle
 * @param {number} cy - center of rectangle
 * @param {number} angle - rotation (in radians)
 * @param {number} width - the width of the rectangle
 * @param {number} height - rectangle height
 * @returns {HitInfo} - 
 */
function hitRectangle(ray, cx, cy, angle, width, height)
{
    let result = new HitInfo(9999, ray.x+ray.dx*9999, ray.y+ray.dy*9999, 0, 0, -1);

    const [rayX, rayY] = vec2.rotate(ray.x, ray.y, -angle, cx, cy);
    const [dirX, dirY] = vec2.rotate(ray.dx, ray.dy, -angle);

    const tNearX = (cx - width  / 2.0 - rayX) / dirX;
    const tNearY = (cy - height / 2.0 - rayY) / dirY;
    const tFarX =  (cx + width  / 2.0 - rayX) / dirX;
    const tFarY =  (cy + height / 2.0 - rayY) / dirY;

    const tNear = Math.max(Math.min(tNearX, tFarX), Math.min(tNearY, tFarY));
    const tFar = Math.min(Math.max(tNearX, tFarX), Math.max(tNearY, tFarY));

    // find closest
    let t = 9999;
    if(tNear>0 && tNear<t) t=tNear;
    if(tFar>0 && tFar<t) t = tFar;

    if (t == 9999) {
        return result;
    }

    let Ix = rayX+dirX*t;
    let Iy = rayY+dirY*t;

    let Nx = 0.0;
    let Ny = 0.0;

    if (Ix+EPSILON >= cx - width / 2.0  && Ix-EPSILON <= cx + width / 2.0 &&
        Iy+EPSILON >= cy - height / 2.0 && Iy-EPSILON <= cy + height / 2.0) {
        if (Math.abs(Ix - cx + width / 2.0) < EPSILON) {
            [Nx, Ny] = [-1.0, 0.0];
        } else if (Math.abs(Ix - cx - width / 2.0) < EPSILON) {
            [Nx, Ny] = [1.0, 0.0];
        } else if (Math.abs(Iy - cy + height / 2.0) < EPSILON) {
            [Nx, Ny] = [0.0, -1.0];
        } else if (Math.abs(Iy - cy - height / 2.0) < EPSILON) {
            [Nx, Ny] = [0.0, 1.0];
        }

        [Ix, Iy] = vec2.rotate(Ix, Iy, angle, cx, cy);
        [Nx, Ny] = vec2.rotate(Nx, Ny, angle);

        result = new HitInfo(t, Ix, Iy, Nx, Ny, -1);
    }

    return result;
}

/**
 * Calculates the center and radius of a circle that passes through three given points.
 * @param {number} Sx - The x-coordinate of the first point.
 * @param {number} Sy - The y-coordinate of the first point.
 * @param {number} Mx - The x-coordinate of the second point.
 * @param {number} My - The y-coordinate of the second point.
 * @param {number} Ex - The x-coordinate of the third point.
 * @param {number} Ey - The y-coordinate of the third point.
 * @returns {{cx: number, cy: number, r: number}} An object containing the x and y coordinates of the circle's center (cx, cy) and its radius (r).
 */
function makeCircleFromThreePoints(Sx, Sy, Mx, My, Ex, Ey)
{
    const a = Sx * (My - Ey) - Sy * (Mx - Ex) + Mx * Ey - Ex * My;
    
    const b = (Sx * Sx + Sy * Sy) * (Ey - My) 
            + (Mx * Mx + My * My) * (Sy - Ey)
            + (Ex * Ex + Ey * Ey) * (My - Sy);
    
    const c = (Sx * Sx + Sy * Sy) * (Mx - Ex) 
          + (Mx * Mx + My * My) * (Ex - Sx) 
          + (Ex * Ex + Ey * Ey) * (Sx - Mx);
    
    const cx = -b / (2.0 * a);
    const cy = -c / (2.0 * a);
    const r = Math.sqrt((cx - Sx) * (cx - Sx) + (cy - Sy) * (cy - Sy));
    return {cx, cy, r};
}

/**
 * Determines if a point is within a given circle.
 * @param {number} cx - The x-coordinate of the circle's center.
 * @param {number} cy - The y-coordinate of the circle's center.
 * @param {number} r - The radius of the circle.
 * @param {number} px - The x-coordinate of the point.
 * @param {number} py - The y-coordinate of the point.
 * @returns {boolean} True if the point is within the circle, otherwise false.
 */
function circleConainsPoint({cx, cy, r}, px, py)
{
    const vx = cx - px;
    const vy = cy - py;
    return vec2.dot([vx, vy], [vx, vy]) < Math.pow(r + EPSILON, 2);
}

/**
 * Determines if a point is within a given rectangle.
 * @param {object} rect - The x-coordinate of the rectangle's center.
 * @param {number} rect.cx - The x-coordinate of the rectangle's center.
 * @param {number} rect.cy - The y-coordinate of the rectangle's center.
 * @param {number} rect.width - The width of the rectangle.
 * @param {number} rect.height - The height of the rectangle.
 * @param {number} px - The x-coordinate of the point.
 * @param {number} py - The y-coordinate of the point.
 * @returns {boolean} True if the point is within the rectangle, otherwise false.
 */
function rectangleContainsPoint(rect, px, py){
    const {cx, cy, width, height} = rect;
    return cx-width/2.0  < px && px < cx+width/2.0 && 
           cy-height/2.0 < py && py < cy+height/2.0;
}

/**
 * Calculates the closest intersection of a ray with a spherical lens.
 * @param {Ray} ray - The ray object with properties origin and direction.
 * @param {number} cx - center of lens
 * @param {number} cy - center of lens
 * @param {number} angle - lens rotation
 * @param {number} diameter
 * @param {number} centerThickness
 * @param {number} edgeThickness
 * @returns {HitInfo} - 
 */
function hitSphericalLens(ray, cx, cy, angle, diameter, centerThickness, edgeThickness)
{
    let result = new HitInfo(9999, ray.x+ray.dx*9999, ray.y+ray.dy*9999, 0, 0, -1);

    const [rayX, rayY] = vec2.rotate(ray.x, ray.y, -angle, cx, cy);
    const [dirX, dirY] = vec2.rotate(ray.dx, ray.dy, -angle);

    // make circles
    const top =         cy + diameter/2.0;
    const bottom =      cy - diameter/2.0;
    const edgeLeft =    cx -   edgeThickness/2.0;
    const edgeRight =   cx + edgeThickness/2.0;
    const centerLeft =  cx - centerThickness/2.0
    const centerRight = cx +   centerThickness/2.0

    const leftCircle = makeCircleFromThreePoints(edgeLeft, top, centerLeft, cy, edgeLeft, bottom);
    const rightCircle = makeCircleFromThreePoints(edgeRight, top, centerRight, cy, edgeRight, bottom);

    // intersect circles
    const leftHit = hitCircle(ray, leftCircle.cx, leftCircle.cy, leftCircle.r);
    const rightHit = hitCircle(ray, rightCircle.cx, rightCircle.cy, rightCircle.r);
    
    const IsConvex = centerThickness>edgeThickness;

    if(IsConvex)
    {
        const LeftCircleContains_LeftIntersection   = circleConainsPoint(leftCircle,   leftHit.x, leftHit.y);
        const LeftCircleContains_RightIntersection  = circleConainsPoint(leftCircle,   rightHit.x, rightHit.y);
        const RightCircleContains_LeftIntersection  = circleConainsPoint(rightCircle,  leftHit.x, leftHit.y);
        const RightCircleContains_RightIntersection = circleConainsPoint(rightCircle,  rightHit.x, rightHit.y);
        if (LeftCircleContains_RightIntersection && 
           RightCircleContains_LeftIntersection)
        {
            // Return closest hitpoint that is inside the circles intersection
            if(leftHit.t<result.t) result = leftHit;
            if(rightHit.t<result.t) result = rightHit;
            
        }
        else if (LeftCircleContains_RightIntersection)
        {
            result = rightHit;
        }
        else if (RightCircleContains_LeftIntersection)
        {
            result = leftHit;
        }
    }
    else //Concave
    {

        leftHit.nx  *= -1.0;
        leftHit.ny  *= -1.0;
        rightHit.nx *= -1.0;
        rightHit.ny *= -1.0;

        const bbox = {cx: cx, cy: cy, width: Math.max(edgeThickness, centerThickness), height: diameter};
        if(rectangleContainsPoint(bbox, leftHit.x, leftHit.y) && 
        rectangleContainsPoint(bbox, leftHit.x, leftHit.y))
        {
            if(leftHit.t < rightHit.t) {result = leftHit;} else {result = rightHit;};
        }
        else if(rectangleContainsPoint(bbox, leftHit.x, leftHit.y))
        {
            result = leftHit;
        }
    }

    return result;
}

export {HitInfo, hitCircle, hitLineSegment, hitTriangle, hitSphericalLens, hitRectangle}