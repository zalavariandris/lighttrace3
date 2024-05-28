function rotatePoint(x, y, radAngle, pivotX, pivotY)
{
    const x1 = pivotX + (x - pivotX) * Math.cos(radAngle) - (y - pivotY) * Math.sin(radAngle);
    const y1 = pivotY + (x - pivotX) * Math.sin(radAngle) + (y - pivotY) * Math.cos(radAngle);

    return [x1, y1];
}

function makeCircleFromThreePoints(S, M, E, {material}={})
{
    var Sx = S.x;
    var Sy = S.y;
    var Mx = M.x;
    var My = M.y;
    var Ex = E.x;
    var Ey = E.y;
  
    var a = Sx * (My - Ey) - Sy * (Mx - Ex) + Mx * Ey - Ex * My;
  
    var b = (Sx * Sx + Sy * Sy) * (Ey - My) 
          + (Mx * Mx + My * My) * (Sy - Ey)
          + (Ex * Ex + Ey * Ey) * (My - Sy);
   
    var c = (Sx * Sx + Sy * Sy) * (Mx - Ex) 
          + (Mx * Mx + My * My) * (Ex - Sx) 
          + (Ex * Ex + Ey * Ey) * (Sx - Mx);
   
    var Cx = -b / (2 * a);
    var Cy = -c / (2 * a);
  
    return {
        Cx:Cx, 
        Cy:Cy, 
        material:material, 
        radius: Math.hypot(Cx - Sx, Cy - Sy)
    };
}

function arcFromThreePoints({Sx, Sy, Mx, My, Ex, Ey})
{
    const circle = makeCircleFromThreePoints({x:Sx, y:Sy}, {x:Mx, y:My}, {x:Ex, y:Ey})
    const r = circle.radius;
    const [SEx, SEy] = [Ex - Sx, Ey - Sy];
    const [SMx, SMy] = [Mx - Sx, My - Sy];
    const crossProduct = SEx * SMy - SEy * SMx;
    const side = crossProduct>0 ? 0 : 1; // 0: Left, 1:right
    return `M ${Sx} ${Sy} `+
    `a ${Math.abs(r)} ${Math.abs(r)} 0 0 ${side} ${Ex-Sx} ${Ey-Sy} `;
}

function makePathFromLens({cx,cy,diameter,edgeThickness, centerThickness})
{
    return ""+
    arcFromThreePoints({
        Sx: cx-edgeThickness/2, 
        Sy: cy-diameter/2,
        Mx: cx-centerThickness/2,
        My: cy,
        Ex: cx-edgeThickness/2, 
        Ey: cy+diameter/2
    })+
    `L ${cx+edgeThickness/2} ${cy+diameter/2}`+
    arcFromThreePoints({
        Sx: cx+edgeThickness/2, 
        Sy: cy+diameter/2,
        Mx: cx+centerThickness/2,
        My: cy,
        Ex: cx+edgeThickness/2, 
        Ey: cy-diameter/2
    })+
    `L ${cx-edgeThickness/2} ${cy-diameter/2}` // this should work with close path 'Z'
}

export {rotatePoint, makeCircleFromThreePoints, arcFromThreePoints, makePathFromLens};