class HitInfo
{
     constructor({t, position, normal, material}={})
    {
        this.t = t;
        this.position = position;
        this.normal=normal;
        this.material = material;
    }

    copy()
    {
        return new HitPoint({
            t: this.t,
            position: this.position, 
            normal: this.normal, 
            material: this.material
        });
    }

    toString()
    {
        return `HitPoint(${this.t, this.position}, ${this.normal})`
    }
}

export default HitPoint;