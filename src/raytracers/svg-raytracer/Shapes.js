class Rectangle{
    cx;
    cy;
    angle;
    width;
    height;

    constructor(cx, cy, angle, width, height){
        this.cx = cx;
        this.cy = cy;
        this.angle = angle;
        this.width = width;
        this.height = height;
    }
}

class Circle{
    cx;
    cy;
    r;

    constructor(cx, cy, r){
        this.cx = cx;
        this.cy = cy;
        this.r = r;
    }

    static fromThreePoints([Sx, Sy], [Mx, My], [Ex, Ey])
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
        return new Circle(cx, cy, r);
    }
}

class LineSegment{
    x1; y1; x2; y2;
    constructor(x1, y1, x2, y2){
        this.x1=x1;
        this.y1=y1;
        this.x2=x2;
        this.y2=y2;
    }
}

class Triangle{
    cx;
    cy;
    angle;
    size;
    constructor(cx, cy, angle, size){
        this.cx=cx;
        this.cy=cy;
        this.angle = angle;
        this.size = size;
    }
}

class SphericalLens{
    cx;
    cy;
    angle;
    diameter;
    centerThickness;
    edgeThickness;

    constructor(cx, cy, angle, diameter, centerThickness, edgeThickness){
        this.cx = cx;
        this.cy = cy;
        this.angle = angle;
        this.diameter = diameter;
        this.centerThickness = centerThickness;
        this.edgeThickness = edgeThickness;
    }
}
export {Circle, Rectangle, Triangle, LineSegment, SphericalLens};