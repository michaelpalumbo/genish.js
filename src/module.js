class WASMProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.wasm = null
    
    // perhaps pass samplerate to wasm constructor... 
    // are there other methods / properties that I need to do this for?
    const memory = new WebAssembly.Memory({ 
      initial:50, maximum:50, shared:true 
    })
    
    this.port.onmessage = async (msg) => {
      if( msg.data.address === 'memory' ) {
        // XXX replace with actual sampling rate at some point...
        this.sr = new WebAssembly.Global({value:'f32', mutable:false}, msg.data.sr )
        this.clock = new WebAssembly.Global({ value:'i32', mutable:true}, 1 )
        
        WebAssembly.instantiate( 
          msg.data.wasm, 
          {
            env: { 
              memory, sr:this.sr, 
              fmax:0x7fffffff,
              _logi:function( n ) { console.log(n) }, 
              _logf:function( n ) { console.log(n) } 
            },
            math: { 
              sin:  Math.sin,
              cos:  Math.cos,
              tan : Math.tan,
              asin: Math.asin, 
              acos: Math.acos,
              atan: Math.atan,
              tanh: Math.tanh,
              pow:  Math.pow,
              atan2: Math.atan2,
              pi:   Math.PI, 
              twopi:Math.PI * 2 
            }
          } 
        )
        .then( wasm => {
          this.wasm = wasm.instance.exports
          this.memory = memory.buffer
          
          this.port.postMessage({
            address:'memory',
            memory:this.memory
          })
          
          //this.wasm.create_sin_table()
          
          // buffer, byteOffset, length
          //this.outputL = new Float32Array( memory.buffer, 0, 256 )
          //this.outputR = new Float32Array( memory.buffer, 512, 128 )
          this.output = new Float32Array( memory.buffer, 0, 256 )
          this.outputL = this.output.subarray( 0, 128 )
          this.outputR = this.output.subarray( 128, 256 )

        })
      } else if( msg.data.address === 'render' ) {
        this.renderLocation = msg.data.loc
        this.renderFunction = msg.data.func
        this.numChannels = 1
      } else if( msg.data.address === 'renderStereo' ) {
        this.renderLocationL = msg.data.left.loc
        this.renderLocationR = msg.data.right.loc
        this.numChannels = 2
      } else if( msg.data.address === 'sampleRate' ) {
        this.sr.value = msg.data.value
      } else if( msg.data.address === 'function' ) {
        this.wasm[ msg.data.key ]( msg.data.loc )
      }
    }
  }

  process(inputs, outputs, parameters) {
    const len = outputs[0][0].length
    const output = outputs[0][0]
    if( this.numChannels === 1 ) {
      this.wasm.render( this.renderLocation, len, 0 )
      outputs[0][0].set( this.outputL )
      outputs[0][1].set( this.outputL )
    }else{
      this.wasm.renderStereo(
        this.renderLocationL,
        this.renderLocationR,
        len,
        0
      )

      outputs[0][0].set( this.outputL )
      outputs[0][1].set( this.outputR )
    }
    
    return true
  }
}

registerProcessor( 'wasm-test', WASMProcessor )