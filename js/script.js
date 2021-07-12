/*
TODO: FIX FROM YELLOW TO BLUE
*/

const difficultyButtons = document.getElementById("difficulty-voting");
let socket;
let sudokuBoard = new Array(9);
let selectedCell;
let noting = false;
let voted = false;

let erroredCells = [];
window.onload = () => {
  for (let i = 0; i < 9; i++) sudokuBoard[i] = new Array(9);

  connectToServer();

  window.addEventListener("keyup", (e) => {
    const key = e.key;

    const validNums = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
    if (selectedCell) {
      const currentX = selectedCell.x;
      const currentY = selectedCell.y;

      if (key === "ArrowUp" || key === "w") {
        if (currentY - 1 >= 0) {
          const newCell = sudokuBoard[selectedCell.y - 1][selectedCell.x];
          if (newCell) {
            newCell.classList.toggle("selected-cell");
            selectedCell.classList.toggle("selected-cell");
            selectedCell = newCell;
          }
        }
      } else if (key === "ArrowLeft" || key === "a") {
        if (currentX - 1 >= 0) {
          const newCell = sudokuBoard[selectedCell.y][selectedCell.x - 1];
          newCell.classList.toggle("selected-cell");
          selectedCell.classList.toggle("selected-cell");
          selectedCell = newCell;
        }
      } else if (key === "ArrowRight" || key === "d") {
        if (currentX + 1 <= 8) {
          const newCell = sudokuBoard[selectedCell.y][selectedCell.x + 1];
          newCell.classList.toggle("selected-cell");
          selectedCell.classList.toggle("selected-cell");
          selectedCell = newCell;
        }
      } else if (key === "ArrowDown" || key === "s") {
        if (currentY + 1 <= 8) {
          const newCell = sudokuBoard[selectedCell.y + 1][selectedCell.x];
          newCell.classList.toggle("selected-cell");
          selectedCell.classList.toggle("selected-cell");
          selectedCell = newCell;
        }
      } else if (key === "Backspace") {
        if (selectedCell && !selectedCell.predefined) {
          for (const cell of erroredCells) {
            cell.classList.remove("errored-cell");
          }
          erroredCells.length = 0;
          const valueDiv = selectedCell.getElementsByClassName("value")[0];
          valueDiv.textContent = "";
          socket.emit(
            "number_placed",
            JSON.stringify({
              x: selectedCell.x,
              y: selectedCell.y,
              value: "",
            })
          );
        }
      } else if (validNums.includes(key)) {
        if (selectedCell && !selectedCell.predefined) {
          if (noting) {
            const noteDiv = selectedCell.getElementsByClassName("notes")[0];
            const valueDiv = selectedCell.getElementsByClassName("value")[0];
            const notes = noteDiv.getElementsByTagName("div");
            for (const note of notes) {
              if (note.className === `n${key}`) {
                if (note.textContent === "" && valueDiv.textContent === "") {
                  note.textContent = key;

                  socket.emit(
                    "note_placed",
                    JSON.stringify({
                      x: selectedCell.x,
                      y: selectedCell.y,
                      noteValue: key,
                    })
                  );
                } else {
                  note.textContent = "";

                  socket.emit(
                    "note_placed",
                    JSON.stringify({
                      x: selectedCell.x,
                      y: selectedCell.y,
                      noteValue: "",
                    })
                  );
                }
              }
            }
          } else {
            const valueDiv = selectedCell.getElementsByClassName("value")[0];
            valueDiv.textContent = key;
            for (const cell of erroredCells) {
              cell.classList.remove("errored-cell");
            }
            const noteDiv = selectedCell.getElementsByClassName("notes")[0];
            for (const note of Array.from(noteDiv.children)) {
              note.textContent = "";
            }
            erroredCells.length = 0;
            checkCollisions(selectedCell);
            socket.emit(
              "number_placed",
              JSON.stringify({
                x: selectedCell.x,
                y: selectedCell.y,
                value: key,
              })
            );
          }
        }
      }
    }
  });

  Array.from(difficultyButtons.children).forEach((button) => {
    button.addEventListener("click", () => {
      if (!voted) {
        button.style.border = "1px solid #44a4fe";
        socket.emit("difficulty_voted", button.textContent);
        voted = true;
      }
    });
  });
};

const connectToServer = () => {
  const serverUrl = `https://midi-confused-canoe.glitch.me`;

  socket = io(serverUrl);

  assignClientListeners();
};

const assignClientListeners = () => {
  // successfully connected to server

  // received board from server
  socket.on("board_received", (board) => {
    loadSudoku(board);
  });

  socket.on("number_received", (arg) => {
    const { x, y, value } = JSON.parse(arg);
    sudokuBoard[y][x].getElementsByClassName("value").textContent = value;

    Array.from(sudokuBoard[y][x].querySelector(".notes").children).forEach(
      (note) => (note.textContent = "")
    );
  });

  socket.on("note_received", (arg) => {
    const { x, y, noteValue } = JSON.parse(arg);

    const notesDiv = sudokuBoard[y][x].getElementsByClassName("notes")[0];

    for (const note of Array.from(notesDiv.getElementsByTagName("div"))) {
      if (note.className === `n${noteValue}`) {
        note.textContent = noteValue;
      }
    }
  });

  socket.on("game_won", (arg) => {
    const { timeString } = JSON.parse(arg);

    const modal = document.getElementById("win-modal");
    const grid = document.getElementById("table");
    const buttons = document.getElementById("buttons");
    const timeText = document.getElementById("modal-time");
    const currentVotingText = document.getElementById("current-voting");

    grid.parentElement.removeChild(grid);
    buttons.parentElement.removeChild(buttons);

    modal.style.display = "flex";
    voted = false;
    Array.from(difficultyButtons.children).forEach((button) => {
      button.style.border = "1px solid #f6f6f6";
    });
    timeText.textContent = timeString;

    currentVotingText.textContent = "Next difficulty: 2";
  });

  socket.on("current_vote_result", (arg) => {
    const value = arg;
    document.getElementById(
      "current-voting"
    ).textContent = `Next difficulty: ${value}`;
  });

  socket.on("next_game_time", (arg) => {
    const value = arg;
    document.getElementById(
      "server-time"
    ).textContent = `Next game starting in ${value} seconds...`;
  });

  socket.on("next_game_starting", (arg) => {
    document.getElementById(
      "server-time"
    ).textContent = `Next game starting...`;
  });

  socket.on("new_board_received", (arg) => {
    const board = arg;
    loadSudoku(board);
  });

  socket.on("joined_on_game_won", (arg) => {
    const { timeString, voteStandings } = JSON.parse(arg);
    document.getElementsByTagName("main")[0].style.display = "none";
    document.getElementById("win-modal").style.display = "none";
    document.getElementById("interact")
      ? (document.getElementById("interact").style.display = "none")
      : null;

    const modal = document.getElementById("win-modal");
    const timeText = document.getElementById("modal-time");
    const currentVotingText = document.getElementById("current-voting");

    modal.style.display = "flex";
    voted = false;
    Array.from(difficultyButtons.children).forEach((button) => {
      button.style.border = "1px solid #f6f6f6";
    });
    timeText.textContent = timeString;

    currentVotingText.textContent = `Next difficulty: ${voteStandings}`;
  });

  socket.on("client_count_changed", (arg) => {
    const numberOfOtherClients = arg;

    const clientCountText = document.getElementById("connection-count");
    if (clientCountText) {
      clientCountText.textContent = `Other connected players: ${numberOfOtherClients}`;
    }
  });
};

const loadSudoku = (board) => {
  if (document.getElementById("table")) {
    return;
  }
  // remove input container

  document.getElementById("win-modal").style.display = "none";
  if (document.getElementById("interact"))
    document.getElementById("interact")
      ? (document.getElementById("interact").style.display = "none")
      : null;

  const table = document.createElement("div");
  table.id = "table";

  // iterate through board's squares and create cell elements

  for (const row of board) {
    for (const square of row) {
      const { x, y, value, notes, predefined } = square;

      // create cell
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.x = x;
      cell.y = y;

      // determine if the cell should be colored or not
      if (
        isCellInTopLeftBox(cell) ||
        isCellInTopRightBox(cell) ||
        isCellInMidMidBox(cell) ||
        isCellInBottomLeftBox(cell) ||
        isCellInBottomRightBox(cell)
      ) {
        cell.classList.add("colored");
      }

      cell.addEventListener("click", () => {
        if (selectedCell) {
          selectedCell.classList.toggle("selected-cell");
        }
        cell.classList.toggle("selected-cell");
        selectedCell = cell;
      });

      const notesDiv = document.createElement("div");
      notesDiv.classList.add("notes");

      for (let noteNum = 1; noteNum <= 9; noteNum++) {
        const noteBox = document.createElement("div");
        noteBox.classList.add(`n${noteNum}`);

        for (const note of notes) {
          if (note === noteNum) {
            noteBox.textContent = note;
          }
        }

        notesDiv.appendChild(noteBox);
      }

      const valueDiv = document.createElement("div");
      valueDiv.classList.add("value");
      valueDiv.textContent = value ? value : "";

      // if the cell has a preexisting value, it came on the board and cannot be changed
      cell.predefined = predefined;
      if (predefined) {
        cell.classList.add("predefined-cell");
      }

      cell.appendChild(notesDiv);
      cell.appendChild(valueDiv);

      sudokuBoard[y][x] = cell;
      table.appendChild(cell);
    }
  }

  document.body.appendChild(table);

  const buttonsDiv = document.createElement("div");
  buttonsDiv.id = "buttons";
  // keypad

  const keypad = document.createElement("div");
  keypad.id = "keypad";

  for (let i = 1; i <= 9; i++) {
    const keynum = document.createElement("div");
    keynum.classList.add("keynum");
    keynum.textContent = i;

    keynum.addEventListener("click", () => {
      if (selectedCell && !selectedCell.predefined) {
        if (noting) {
          const noteDiv = selectedCell.getElementsByClassName("notes")[0];
          const valueDiv = selectedCell.getElementsByClassName("value")[0];
          const notes = noteDiv.getElementsByTagName("div");
          for (const note of notes) {
            if (note.className === `n${i}`) {
              if (note.textContent === "" && valueDiv.textContent === "") {
                note.textContent = i;

                socket.emit(
                  "note_placed",
                  JSON.stringify({
                    x: selectedCell.x,
                    y: selectedCell.y,
                    noteValue: i,
                  })
                );
              } else {
                note.textContent = "";

                socket.emit(
                  "note_placed",
                  JSON.stringify({
                    x: selectedCell.x,
                    y: selectedCell.y,
                    noteValue: "",
                  })
                );
              }
            }
          }
        } else {
          const valueDiv = selectedCell.getElementsByClassName("value")[0];
          valueDiv.textContent = i;

          const noteDiv = selectedCell.getElementsByClassName("notes")[0];
          for (const note of Array.from(noteDiv.children)) {
            note.textContent = "";
          }
          for (const cell of erroredCells) {
            cell.classList.remove("errored-cell");
          }
          erroredCells.length = 0;
          checkCollisions(selectedCell);
          socket.emit(
            "number_placed",
            JSON.stringify({
              x: selectedCell.x,
              y: selectedCell.y,
              value: i,
            })
          );
        }
      }
    });

    keypad.appendChild(keynum);
  }

  // notes/erase button

  const interactDiv = document.createElement("div");
  interactDiv.id = "interact";

  const noteButton = document.createElement("div");
  noteButton.classList.add("notebutton");

  /*<i class="fas fa-pencil-alt"></i>*/

  const pencilIcon = document.createElement("i");
  pencilIcon.className = "fas fa-pencil-alt";

  noteButton.addEventListener("click", () => {
    noting = !noting;
    noteButton.classList.toggle("noteon");
  });
  noteButton.appendChild(pencilIcon);
  const eraseButton = document.createElement("div");
  eraseButton.classList.add("erasebutton");

  /*<i class="fas fa-eraser"></i>*/

  const eraserIcon = document.createElement("i");
  eraserIcon.className = "fas fa-eraser";

  eraseButton.addEventListener("click", () => {
    if (selectedCell && !selectedCell.predefined) {
      for (const cell of erroredCells) {
        cell.classList.remove("errored-cell");
      }
      erroredCells.length = 0;
      const valueDiv = selectedCell.getElementsByClassName("value")[0];
      valueDiv.textContent = "";

      socket.emit(
        "number_placed",
        JSON.stringify({
          x: selectedCell.x,
          y: selectedCell.y,
          value: "",
        })
      );
    }
  });
  eraseButton.appendChild(eraserIcon);

  interactDiv.appendChild(noteButton);
  interactDiv.appendChild(eraseButton);
  buttonsDiv.appendChild(keypad);
  buttonsDiv.appendChild(interactDiv);

  // connections indicator

  const connectionCount = document.createElement("h5");
  connectionCount.id = "connection-count";
  connectionCount.classList.add("connection-count");

  connectionCount.textContent = "Other connected players: 0";
  buttonsDiv.appendChild(connectionCount);

  document.body.appendChild(buttonsDiv);
};

const checkCollisions = (cell) => {
  const value = cell.querySelector(".value").textContent;
  // check row

  getCellRowCoords(cell).forEach((coords) => {
    const [x, y] = coords;
    const otherCell = sudokuBoard[y][x];
    const otherValue = otherCell.querySelector(".value").textContent;

    if (otherCell !== cell && otherValue === value) {
      cell.classList.add("errored-cell");
      otherCell.classList.add("errored-cell");
      erroredCells.push(cell);
      erroredCells.push(otherCell);
    }
  });

  getCellColCoords(cell).forEach((coords) => {
    const [x, y] = coords;
    const otherCell = sudokuBoard[y][x];
    const otherValue = otherCell.querySelector(".value").textContent;

    if (otherCell !== cell && otherValue === value) {
      cell.classList.add("errored-cell");
      otherCell.classList.add("errored-cell");
      erroredCells.push(cell);
      erroredCells.push(otherCell);
    }
  });

  // check box
  getCellBoxCoords(cell).forEach((coord) => {
    const [x, y] = coord;
    const otherCell = sudokuBoard[y][x];
    const otherValue = otherCell.querySelector(".value").textContent;

    if (otherCell !== cell && otherValue === value) {
      cell.classList.add("errored-cell");
      otherCell.classList.add("errored-cell");
      erroredCells.push(cell);
      erroredCells.push(otherCell);
    }
  });
};

const isCellInTopLeftBox = (cell) => {
  return cell.x < 3 && cell.y < 3;
};

const isCellInTopMidBox = (cell) => {
  return cell.x > 2 && cell.x < 6 && cell.y < 3;
};
const isCellInTopRightBox = (cell) => {
  return cell.x > 5 && cell.y < 3;
};
const isCellInMidLeftBox = (cell) => {
  return cell.x < 3 && cell.y < 6 && cell.y > 2;
};
const isCellInMidMidBox = (cell) => {
  return cell.x < 6 && cell.x > 2 && cell.y < 6 && cell.y > 2;
};

const isCellInMidRightBox = (cell) => {
  return cell.x > 5 && cell.y < 6 && cell.y > 2;
};

const isCellInBottomLeftBox = (cell) => {
  return cell.x < 3 && cell.y > 5;
};

const isCellInBottomMidBox = (cell) => {
  return cell.x > 2 && cell.x < 6 && cell.y > 5;
};
const isCellInBottomRightBox = (cell) => {
  return cell.x > 5 && cell.y > 5;
};

// gets all 9 coord pairs of the cells inside the cell's box
const getCellBoxCoords = (cell) => {
  // top left
  if (isCellInTopLeftBox(cell)) {
    return [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ];
  }

  // top mid
  else if (isCellInTopMidBox(cell)) {
    return [
      [3, 0],
      [3, 1],
      [3, 2],
      [4, 0],
      [4, 1],
      [4, 2],
      [5, 0],
      [5, 1],
      [5, 2],
    ];
  }

  // top right
  else if (isCellInTopRightBox(cell)) {
    return [
      [6, 0],
      [6, 1],
      [6, 2],
      [7, 0],
      [7, 1],
      [7, 2],
      [8, 0],
      [8, 1],
      [8, 2],
    ];
  }

  // mid left
  else if (isCellInMidLeftBox(cell)) {
    return [
      [0, 3],
      [0, 4],
      [0, 5],
      [1, 3],
      [1, 4],
      [1, 5],
      [2, 3],
      [2, 4],
      [2, 5],
    ];
  }
  // mid mid
  else if (isCellInMidMidBox(cell)) {
    return [
      [3, 3],
      [3, 4],
      [3, 5],
      [4, 3],
      [4, 4],
      [4, 5],
      [5, 3],
      [5, 4],
      [5, 5],
    ];
  }
  // mid right
  else if (isCellInMidRightBox(cell)) {
    return [
      [6, 3],
      [6, 4],
      [6, 5],
      [7, 3],
      [7, 4],
      [7, 5],
      [8, 3],
      [8, 4],
      [8, 5],
    ];
  }
  // bottom left
  else if (isCellInBottomLeftBox(cell)) {
    return [
      [0, 6],
      [0, 7],
      [0, 8],
      [1, 6],
      [1, 7],
      [1, 8],
      [2, 6],
      [2, 7],
      [2, 8],
    ];
  }
  // bottom mid
  else if (isCellInBottomMidBox(cell)) {
    return [
      [3, 6],
      [3, 7],
      [3, 8],
      [4, 6],
      [4, 7],
      [4, 8],
      [5, 6],
      [5, 7],
      [5, 8],
    ];
  }
  //bottom right
  else if (isCellInBottomRightBox(cell)) {
    return [
      [6, 6],
      [6, 7],
      [6, 8],
      [7, 6],
      [7, 7],
      [7, 8],
      [8, 6],
      [8, 7],
      [8, 8],
    ];
  }
};

// gets all 9 coord pairs of cells inside the cell's row
const getCellRowCoords = (cell) => {
  let coords = [];
  for (let col = 0; col < 9; col++) {
    coords.push([col, cell.y]);
  }
  return coords;
};

const getCellColCoords = (cell) => {
  let coords = [];
  for (let row = 0; row < 9; row++) {
    coords.push([cell.x, row]);
  }
  return coords;
};
