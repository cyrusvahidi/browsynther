import * as p5 from "p5/lib/p5.min"
import './css/style.css';
import { Synth, Noise } from './tone';
import { subscribe, sendSocketUpdate } from './api/subscribe';
import Tone from 'tone';
import {User} from './state';

var randomColor = require('randomcolor'); // import the script

const transport = Tone.Transport;
Tone.Transport.bpm.value = 120;
Tone.Transport.start();

const synths = {synth: "synth"}
const synth =  new Synth();

const thisUser = new User(randomColor(), "synth");

const intervals = ['1n', '2n', '4n', '8n', '8t', '16n', '32n', '64n'];

const scales = {
  minor: {
    c: ['C3', 'D3', 'Eb3', 'F3', 'G3', 'Ab3', 'Bb3', 'C4', 'D4', 'Eb4', 'F4', 'G4', 'Ab4', 'Bb4', 'C5'],
    d: ['D3', 'E3', 'F3', 'G3', 'A3', 'Bb3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'Bb4', 'C4', 'D5']
  }
}

var currentScale = scales.minor.c;

let sketch = (p5) => {
    var w;
    var columns;
    var rows;
    var grid;
    var next;
    var currentCell;
    var mouseLocked;

    const disabledColor = 209;

    class Cell {
      constructor(color, player, x, y) {
        this.color = color;
        this.player = player;
        this.x = x;
        this.y = y;
      }

      mouseIsOver() {
        let mouseX = p5.mouseX;
        let mouseY = p5.mouseY;
        if (mouseX > this.x * w && mouseX < (this.x * w) + w && mouseY > this.y * w && mouseY < (this.y * w) + w ) {
          let prevCell = currentCell;
          currentCell = this;
          if (!mouseLocked)  {
            this.color = disabledColor;

            // Tell server that user mouse is not clicked on a cell
            thisUser.setX(-1);
            thisUser.setY(-1);
          } else {
            if (prevCell != currentCell) {
              // If mouse is held and moved to a new cell
              synth.start(currentScale[currentCell.x], intervals[currentCell.y]);
            }

            // Mouse held on cell, set its color and update user position
            this.color = thisUser.color;
            thisUser.setX(this.x);
            thisUser.setY(this.y);

            // Send updated user position to socket
          }
          sendSocketUpdate(thisUser);
        } else {
          this.color = 255;
        }
      }
    }

     p5.setup = () => {
         var cnv = p5.createCanvas(850, 420);
         cnv.mousePressed(fillCurrentCell);
         cnv.mouseReleased(unfillCurrentCell);
         w = 50;
         columns = 15;
         rows = 8;

         grid = new Array(columns);
         for (var i = 0; i < columns; i++) {
           grid[i] = new Array(rows);
         }
         for (var i = 0; i < columns; i++) {
           for (var j = 0; j < rows; j++) {
             grid[i][j] = new Cell(255, null, i, j);
           }
         }

         p5.textAlign(p5.CENTER);
     }

    p5.draw = () => {
      p5.background(255);
      for (var i = 0; i < columns; i++) {
        for (var j = 0; j < rows; j++) {
          p5.fill(grid[i][j].color)
          p5.stroke(209);
          p5.rect(i*w, j*w, w-1, w-1);
          grid[i][j].mouseIsOver()
        }
      }

      // DRAW TEXT
      for (var i = 0; i < columns; i++) {
        p5.fill(0);
        p5.text(currentScale[i], (i * w) + w / 2, rows * (w + 2));
      }
    }

    function fillCurrentCell() {
      currentCell.color = 0;
      mouseLocked = true;
      synth.start(currentScale[currentCell.x], intervals[currentCell.y]);
    }

    function unfillCurrentCell() {
      mouseLocked = false;
      currentCell.color = disabledColor;
      synth.stop();
    }

}
const P5 = new p5(sketch);

subscribe((err, userState) => {
  var messageDiv = document.getElementById('message');
  messageDiv.innerHTML = `${userState.color} ${userState.synth} ${userState.x} ${userState.y}`;
}, thisUser);
