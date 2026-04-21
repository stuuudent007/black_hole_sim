
export const canvasFragmentShader = `
  uniform vec2 uResolution;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uCameraY; 
  uniform float uSpeed;
  uniform int uShowDisk;
  uniform sampler2D uBackgroundTexture;
  uniform vec3 uCameraPos;
  uniform int uShowCalibration; // NEW: Toggle the measurement ring 

  #define EVENT_HORIZON 1.0
  #define ESCAPE_DISTANCE 20.0
  #define MAX_STEPS 10000
  #define STEP_SIZE 0.001
  #define PI 3.14159265359 // NEW: We need pi for spherical math


  #define DISK_INNER 3.0
  #define DISK_OUTER 5.0

  // Generates pseudo-random numbers
  float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  // Smooths the random numbers into a cloudy texture
  float noise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  // Fractal Brownian Motion: Layers multiple frequencies of noise together
  float fbm(vec2 st) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 5; i++) {
          value += amplitude * noise(st);
          st *= 2.0;
          amplitude *= 0.5;
      }
      return value;
  }
    // Geodesic Equation 

  vec3 geodesic_equation(vec3 position, float h2) {
      float r = length(position);
         return -(3.0 / 2.0) * h2 * position / pow(r, 5.0);
      // return vec3(0);
  }

  vec3 get_background_color(vec3 ray_dir) {
      // Convert the 3D direction vector into 2D spherical coordinates (longitude and latitude)
      // atan(z, x) gives longitude from -pi to pi. Dividing by 2*PI and adding 0.5 maps it to 0.0 -> 1.0 (u)
      float u = 0.5 + atan(ray_dir.z, ray_dir.x) / (2.0 * PI);
      
      // asin(y) gives latitude from -pi/2 to pi/2. Dividing by PI and subtracting from 0.5 maps it to 0.0 -> 1.0 (v)
      float v = 0.5 - asin(ray_dir.y) / PI;
      
      // Look up the pixel color from our loaded image
      return texture2D(uBackgroundTexture, vec2(u, v)).rgb;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    uv = uv * 2.0 - 1.0;
    uv.x *= uResolution.x / uResolution.y;
    
    // USE THE DYNAMIC CAMERA Y
    // 1. Define Camera Vectors
    vec3 worldUp = vec3(0.0, 1.0, 0.0);
    vec3 camPos = uCameraPos;
    vec3 target = vec3(0.0, 0.0, 0.0); // Always look at the black hole

    // Calculate the camera's local coordinate system
    vec3 forward = normalize(target - camPos);
    vec3 right = normalize(cross(forward, worldUp));
    vec3 up = cross(right, forward);

    // 2. Generate the Ray Direction
    vec3 ray_vel = normalize(forward + uv.x * right + uv.y * up);
    vec3 ray_pos = camPos;
    /*
    vec3 camera_pos = vec3(0.0, uCameraY, 6.0); 
    vec3 ray_pos = camera_pos;
    vec3 ray_vel = normalize(vec3(uv, -1.0));
    */

    vec3 angular_momentum = cross(ray_pos, ray_vel);
    float h2 = dot(angular_momentum, angular_momentum);

    vec3 final_color = vec3(0.0);

    for(int i = 0; i < MAX_STEPS; i++) {
        float dist = length(ray_pos);
        float dt = dist * dist * STEP_SIZE; 

        float old_y = ray_pos.y;

        vec3 k1 = dt * geodesic_equation(ray_pos, h2);
        vec3 k2 = dt * geodesic_equation(ray_pos + ray_vel * dt + 0.5 * k1, h2);
        vec3 k3 = dt * geodesic_equation(ray_pos + ray_vel * dt + 0.5 * k2, h2);
        vec3 k4 = dt * geodesic_equation(ray_pos + ray_vel * dt + k3, h2);

        vec3 acceleration = (k1 + 2.0 * (k2 + k3) + k4) / 6.0;

        ray_pos += ray_vel * dt;
        ray_vel += acceleration;

        //  ACCRETION DISK 
        if (uShowDisk == 1 && old_y * ray_pos.y < 0.0) {
            if (dist > DISK_INNER && dist < DISK_OUTER) {
                // Orbital Velocity
                // Matter orbits the Y axis. Tangent vector is the cross product of position and UP vector.
                vec3 orbital_dir = normalize(cross(ray_pos, vec3(0.0, 1.0, 0.0)));
                
                // Orbital speed: v = sqrt(GM/r). Since Event Horizon (2GM) = 1.0, GM = 0.5.
                float orbital_speed = sqrt(0.5 / dist);
                vec3 disk_velocity = orbital_dir * orbital_speed;

                // Relative Velocity
                // ray_vel points FROM the camera TO the disk. 
                // We use -dot() so that matter moving towards the camera yields a positive velocity.
                float v_rel = -dot(normalize(ray_vel), disk_velocity);
                
                //  Relativistic Doppler Shift
                float doppler = sqrt((1.0 + v_rel) / (1.0 - v_rel));

                // Gravitational Redshift (Energy lost escaping the well)
                float grav_redshift = sqrt(1.0 - EVENT_HORIZON / dist);

                // Combine Shifts (Relativistic Beaming)
                float total_shift = doppler * grav_redshift;
                
                // Procedural Plasma Texture
                // Convert 3D position to 2D polar coordinates (radius and angle)
                float angle = atan(ray_pos.z, ray_pos.x);
                
                // Differential rotation: Inner parts spin faster
                float spin_speed = uTime * orbital_speed * 2.0 * uSpeed; 
                
                // Scale coordinates for the noise function
                vec2 polar_uv = vec2(dist * 3.0, angle * 4.0 - spin_speed);
                
                // Generate the cloud texture
                float plasma_noise = fbm(polar_uv);
                
                // Base plasma color (deep orange)
                vec3 base_color = vec3(1.0, 0.4, 0.05);

                // We raise total_shift to a power to dramatically enhance the contrast of the beaming effect.
                float intensity = pow(total_shift, 3.0); 

                // Modulate the intensity with our FBM noise so it looks cloudy
                intensity *= (0.4 + plasma_noise * 0.8);

                // If it's highly blueshifted (moving towards us), mix in some bright white
                vec3 shifted_color = mix(base_color * intensity, vec3(1.0, 0.9, 0.8), clamp(intensity - 1.0, 0.0, 1.0));

                // Add a smooth fade-out to the inner and outer edges of the disk
                float normalized_dist = (dist - DISK_INNER) / (DISK_OUTER - DISK_INNER);
                float edge_fade = 1.0 - pow(abs(normalized_dist * 2.0 - 1.0), 2.0);
                
                final_color = shifted_color * edge_fade;
                break; 
            }
        }
        
        if(dist <= EVENT_HORIZON) {
            final_color = vec3(0.0, 0.0, 0.0);
            break; 
        }
        
        if(dist >= ESCAPE_DISTANCE) {
            final_color = get_background_color(normalize(ray_vel));
            break;
        }
        
    
    }
        // ANALYTICAL CALIBRATION
    if (uShowCalibration == 1) {
        // The impact parameter (b) is exactly the magnitude of the initial angular momentum!
        float impact_parameter = sqrt(h2); 
        
        // The analytical shadow radius for a Schwarzschild BH is sqrt(27)/2 * Rs
        float shadow_theoretical = 2.598076; 
        
        // If this pixel's ray has an impact parameter exactly at the theoretical edge, draw a green line
        float ring_thickness = 0.02;
        if (abs(impact_parameter - shadow_theoretical) < ring_thickness) {
            // Mix bright neon green over whatever the RK4 loop calculated
            final_color = mix(final_color, vec3(0.0, 1.0, 0.0), 0.8);
        }
        
        // Let's also draw the physical Event Horizon (1.0 Rs) in red just for reference
        if (abs(impact_parameter - 1.0) < ring_thickness) {
            final_color = mix(final_color, vec3(1.0, 0.0, 0.0), 0.5);
        }
    }

    gl_FragColor = vec4(final_color, 1.0);
  }
`;

