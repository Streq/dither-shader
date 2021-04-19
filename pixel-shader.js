export default class DitherShader{
  r_fact = 0.35;
  g_fact = 0.59;
  b_fact = 0.11;
  matrix = [];
  palette = [];
  threshold = 1.0;
  light = 0.0;
  mask = {r:0,g:0,b:0};

  static toRGB(color){
    return `vec3(${color.r},${color.g},${color.b})/255.f`;
  }

  create(){
    return `#version 300 es


#define R_F float(${this.r_fact})
#define G_F float(${this.g_fact})
#define B_F float(${this.b_fact})
#define PALETE_SIZE ${this.palette.length}
#define MATRIX_LENGTH ${this.matrix.length}
#define MATRIX_DIM ${Math.sqrt(this.matrix.length)}
#define THRESHOLD float(${this.threshold})
#define LIGHT_FACTOR float(${this.light})

// fragment shaders don't have a default precision so we need
// to pick one. mediump is a good default. It means "medium precision"
precision mediump float;

// our texture
uniform sampler2D u_image;

// the texCoords passed in from the vertex shader.
in vec2 v_texCoord;

// we need to declare an output for the fragment shader
out vec4 outColor;

vec3 rgb2hsv(vec3 c)
{
	vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
	vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
	vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

	float d = q.x - min(q.w, q.y);
	float e = 1.0e-10;
	return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 hsv2rgb(vec3 c)
{
	vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
	vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
	return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float floorToLayer(float value,int layers){
	return float(int(value*float(layers)))/float(layers-1);
}

float squareDist(vec3 col1, vec3 col2){
	vec3 distVec = col1-col2;
	return    ((distVec.r)*R_F)*((distVec.r)*R_F)
			+ ((distVec.g)*G_F)*((distVec.g)*G_F)
			+ ((distVec.b)*B_F)*((distVec.b)*B_F);
}

float hsvSquareDist(vec3 col1, vec3 col2){
	vec3 distVec = rgb2hsv(col1-col2);
	//distVec.r *= 1.0;
	//distVec.g *= 0.0;
	//distVec.b *= 1.0;
	distVec = hsv2rgb(distVec);
	return    ((distVec.r)*R_F)*((distVec.r)*R_F)
			+ ((distVec.g)*G_F)*((distVec.g)*G_F)
			+ ((distVec.b)*B_F)*((distVec.b)*B_F);
}


vec3 findClosestColor(vec3 pal[PALETE_SIZE], vec3 col){
	float dist = squareDist(col,pal[0]);
	int index = 0;
	for(int i = 1; i < PALETE_SIZE; ++i){
		float dist1 = squareDist(col,pal[i]);
		if(dist>dist1){
			dist = dist1;
			index = i;
		}
	}
	return pal[index];
}

void main() {
	vec3 palette[PALETE_SIZE] = vec3[PALETE_SIZE](
		${
      (()=>{
        let ret = ``;
        let len = this.palette.length;
        this.palette.forEach((each,index)=>{
          ret+=` ${DitherShader.toRGB(each)}${index!=len-1?',':''}`
        })
        return ret;
      })()
    }
	);

	const int mat[MATRIX_LENGTH] = int[MATRIX_LENGTH](
		${
      (()=>{
        let ret = "";
        let len = this.matrix.length;
        this.matrix.forEach((each,index)=>{
          ret += ` ${each}${index!=len-1?',':''}`
        })
        return ret;
      })()
    }
	);
	

	ivec2 i_tex_size = textureSize(u_image, 0);
	
  vec3 i_pixel = texture(u_image, v_texCoord).rgb;
	ivec2 i_pixel_pos = ivec2(v_texCoord * vec2(i_tex_size));
	
	vec3 threshold = vec3(1.f, 1.f, 1.f)/float(${this.threshold}); /* Estimated precision of the palette */
	vec3 mask = ${DitherShader.toRGB(this.mask)};

	float factor  = float(mat[i_pixel_pos.x % MATRIX_DIM + MATRIX_DIM*(i_pixel_pos.y % MATRIX_DIM)])/float(MATRIX_LENGTH);
	
	vec3 attempt = (i_pixel - mask) * LIGHT_FACTOR + threshold * factor;
  //outColor = vec4(attempt,1);
	outColor = vec4(findClosestColor(palette, attempt),1);
	
}`
  }
}




