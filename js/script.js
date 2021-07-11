const connectButton = document.getElementById("connect");
const ipInput = document.getElementById("ip");
const portInput = document.getElementById("port");
const indicator = document.getElementById("indicator");
const difficultyButtons = document.getElementById("difficulty-voting");
let socket;
let sudokuBoard = new Array(9);
let selectedCell;
let noting = false;
let voted = false;

let erroredCells = [];
window.onload = () => {
  for (let i = 0; i < 9; i++) sudokuBoard[i] = new Array(9);
  connectButton.addEventListener("click", () => {
    connectToServer();
  });

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
      } else if (validNums.includes(key)) {
        if (selectedCell && !selectedCell.predefined) {
          if (noting) {
            const noteDiv = selectedCell.getElementsByClassName("notes")[0];

            const notes = noteDiv.getElementsByTagName("div");
            for (const note of notes) {
              if (note.className === `n${key}` && note.textContent === "") {
                note.textContent = key;

                socket.emit(
                  "note_placed",
                  JSON.stringify({
                    x: selectedCell.x,
                    y: selectedCell.y,
                    noteValue: key,
                  })
                );
              }
            }
          } else {
            selectedCell.textContent = key;
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
        button.style.border = "1px solid #feec44";
        socket.emit("difficulty_voted", button.textContent);
        voted = true;
      }
    });
  });
};

const connectToServer = () => {
  const ip = ipInput.value;
  const port = portInput.value;

  const serverUrl = `https://midi-confused-canoe.glitch.me`;
  toggleIndicator();

  socket = io(serverUrl);

  assignClientListeners();
};

const toggleIndicator = () => {
  indicator.style.display = indicator.style.display === "" ? "block" : "";
};

const assignClientListeners = () => {
  // successfully connected to server
  socket.on("connect", () => {
    // hide indicator once connected
    toggleIndicator();
  });

  // received board from server
  socket.on("board_received", (board) => {
    loadSudoku(board);
  });

  socket.on("number_received", (arg) => {
    const { x, y, value } = JSON.parse(arg);
    sudokuBoard[y][x].textContent = value;
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
  // remove input container
  document.getElementsByTagName("main")[0].style.display = "none";
  document.getElementById("win-modal").style.display = "none";
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

      // determine if the cell should be colored or not
      if (
        (x < 3 && y < 3) ||
        (x > 5 && y < 3) ||
        (x > 2 && x < 6 && y > 2 && y < 6) ||
        (x < 3 && y > 5) ||
        (x > 5 && y > 5)
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
      cell.x = x;
      cell.y = y;
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

          const notes = noteDiv.getElementsByTagName("div");
          for (const note of notes) {
            if (note.className === `n${i}` && note.textContent === "") {
              note.textContent = i;

              socket.emit(
                "note_placed",
                JSON.stringify({
                  x: selectedCell.x,
                  y: selectedCell.y,
                  noteValue: i,
                })
              );
            }
          }
        } else {
          selectedCell.textContent = i;
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
      selectedCell.textContent = "";
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
  // check row
  for (let col = 0; col < 9; col++) {
    const otherCell = sudokuBoard[cell.y][col];
    if (otherCell !== cell && otherCell.textContent === cell.textContent) {
      cell.classList.add("errored-cell");
      otherCell.classList.add("errored-cell");
      erroredCells.push(cell);
      erroredCells.push(otherCell);
    }
  }

  // check col

  for (let row = 0; row < 9; row++) {
    const otherCell = sudokuBoard[row][cell.x];
    if (otherCell !== cell && otherCell.textContent === cell.textContent) {
      cell.classList.add("errored-cell");
      otherCell.classList.add("errored-cell");
      erroredCells.push(cell);
      erroredCells.push(otherCell);
    }
  }
};
