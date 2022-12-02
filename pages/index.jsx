import { useEffect, useState } from "react";
import * as THREE from "three";
import SceneInit from "../lib/SceneInit";
import FragmentShader from "../lib/Shaders";
import VertexShader from "../lib/ShadersVertex";
import MicRecorder from 'mic-recorder-to-mp3';

export default function Home() {
  let audioContext, audioElement, dataArray, analyser, source;
  const [test, setTest] = useState(new SceneInit("myThreeJsCanvas"))

  let gui;
  const initGui = async () => {
    const dat = await import("dat.gui");
    gui = new dat.GUI();
  };

  const setupAudioContext = () => {
    // get audio information from music player
    audioContext = new window.AudioContext();
    audioElement = document.getElementById("myAudio");
    source = audioContext.createMediaElementSource(audioElement);
    analyser = audioContext.createAnalyser();
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    analyser.fftSize = 1024;
    //update array every time we render a new frame
    dataArray = new Uint8Array(analyser.frequencyBinCount);
  };

  const play = async () => {
    if (audioContext === undefined) {
      setupAudioContext();
    }

    const uniforms = {
      u_time: {
        type: "f",
        value: 1.0,
      },
      u_amplitude: {
        type: "f",
        value: 3.0,
      },
      u_data_arr: {
        type: "float[64]",
        value: dataArray,
      },
    };
    const planeGeometry = new THREE.BoxGeometry(64, 64, 8, 64, 64, 8);
    const planeCustomMaterial = new THREE.ShaderMaterial({
      // note: this is where the magic happens
      uniforms: uniforms,
      vertexShader: VertexShader(),
      fragmentShader: FragmentShader(),
      wireframe: true,
    });
    const planeMesh = new THREE.Mesh(planeGeometry, planeCustomMaterial);
    planeMesh.rotation.x = -Math.PI / 2 + Math.PI / 4;
    planeMesh.scale.x = 2;
    planeMesh.scale.y = 2;
    planeMesh.scale.z = 2;
    planeMesh.position.y = 8;
    test.scene.add(planeMesh);
    if (gui === undefined) {
      await initGui();
      const audioWaveGui = gui.addFolder("audio waveform");
      audioWaveGui
        .add(planeCustomMaterial, "wireframe")
        .name("wireframe")
        .listen();
      audioWaveGui
        .add(uniforms.u_amplitude, "value", 1.0, 8.0)
        .name("amplitude")
        .listen();
    }

    const render = (time) => {
      // note: update audio data
      analyser.getByteFrequencyData(dataArray);

      // note: update uniforms
      uniforms.u_time.value = time;
      uniforms.u_data_arr.value = dataArray;

      // note: call render function on every animation frame
      requestAnimationFrame(render);
    };

    render();
  };

  useEffect(() => {
    test.initScene();
    test.animate();
  }, []);

  const [Mp3Recorder, setMp3Recorder] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [blobURL, setBlobURL] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);

  function waitPermissions(){
    navigator.mediaDevices.getUserMedia({audio: true},
      () => {
        console.log("Permissão cedida");
        setIsBlocked(false);
      },
      () => {
        console.log("Permissão negada");
        setIsBlocked(true);
      }
    );
  }

  useEffect(() => {
    waitPermissions();
    setMp3Recorder(new MicRecorder({ bitRate: 128 }));
  }, [])

  const startRecording = () => {
    if(isBlocked){
      alert("Permissão negada");
    }else{
      Mp3Recorder
        .start()
        .then(() => {
          setIsRecording(true);
        }).catch(e => {
          console.log(e);
          alert("Erro ao gravar áudio");
        })
    }
  }

  const stopRecording = async () => {
    await Mp3Recorder
      .stop()
      .getMp3()
      .then(([buffer, blob]) => {
        const blobURLaux = URL.createObjectURL(blob)
        setBlobURL(blobURLaux);
        console.log(blobURLaux)
        setIsRecording(false);
      }).catch((e) => console.log(e));
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="absolute top-5 center-2">
        {
          !isRecording ?
          <button style={{color: "#fff", alignSelf: "center"}} onClick={startRecording} disabled={isRecording}>
            Gravar
          </button>:
          <button style={{color: "#fff", alignSelf: "center"}} onClick={stopRecording} disabled={!isRecording}>
            Parar
          </button>
        }
        {!isRecording && blobURL !== "" ?
          <audio
            id="myAudio"
            src={blobURL}
            className="w-200"
            controls
            autoPlay
            onPlay={play}
          /> : <></>
        }
        <audio
            id="myAudio"
            src="queen.mp3"
            className="w-200"
            controls
            autoPlay
            onPlay={play}
          />
      </div>
      <canvas id="myThreeJsCanvas"></canvas>
    </div>
  );
}
