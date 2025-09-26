# AlgoPaint 🎨✨

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://en.wikipedia.org/wiki/HTML5)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://www.javascript.com/)

A minimalistic, interactive pathfinding visualizer built with HTML, TailwindCSS, and vanilla JavaScript. No build tools, no dependencies, just pure code.

## 🌟 Overview

AlgoPaint is an interactive playground for exploring classic pathfinding algorithms. You can draw obstacles, set start and end points, and watch algorithms like **DFS**, **BFS**, and **A*** search for paths in real-time. The project highlights how fundamental data structures and algorithms work under the hood — all in a lightweight, no-build setup.

It’s designed to impress interviewers and showcase your ability to implement core CS concepts with clean code and thoughtful design.

## 🚀 Features

-   **Interactive Grid**: Click and drag to place start, end, and wall cells.
-   **Multiple Algorithms**: Visualize DFS, BFS, and A*.
-   **Diagonal Movement**: Supports 8-direction movement with Euclidean heuristic for A*.
-   **Real-Time Visualization**: Watch nodes being explored step-by-step with adjustable speed.
-   **Stats Panel**: Displays runtime, explored nodes, and path length.
-   **Minimalistic & Responsive UI**: Built with TailwindCSS and custom CSS for a sleek, modern look that works on all devices.
-   **On-screen Tutorial**: A "How It Works" section guides first-time users.
-   **Zero Dependencies**: Runs in any modern browser, no build tools or `npm install` required.

## 🧩 Tech Behind the Project

This project showcases the use of core DSA concepts in a visual way:

-   **Graph Representation**: The grid is modeled as a 2D graph, with each cell acting as a node and edges connecting adjacent cells. This abstraction makes it easy to apply graph traversal algorithms.
-   **DFS (Depth-First Search)**: Explores paths deeply using a Stack (implemented with an array). DFS is useful for finding any path between two points and demonstrates recursive backtracking.
-   **BFS (Breadth-First Search)**: Guarantees the shortest path in unweighted grids using a Queue (implemented with an array). BFS explores all neighbors level by level, making it ideal for shortest-path problems.
-   **A* Algorithm**: Uses a priority queue and a heuristic (Euclidean distance) to efficiently find optimal paths. A* combines the strengths of BFS and greedy search, balancing path cost and estimated distance.
-   **Heuristics**: Switched from Manhattan to Euclidean distance to accommodate diagonal movement, allowing for more natural pathfinding in 8 directions.
-   **Corner-Cutting Prevention**: Ensures diagonal paths don’t pass through walls improperly by checking adjacent cells before allowing diagonal moves.
-   **State Management**: The grid, start/end points, walls, and algorithm states are managed in plain JavaScript objects and arrays, demonstrating clean separation of concerns.
-   **Visualization Logic**: Animation is handled by updating cell states and re-rendering the grid at controlled intervals, making algorithm steps easy to follow.
-   **Performance Considerations**: Efficient DOM updates and minimal redraws ensure smooth visualization even on large grids.
-   **No Frameworks**: All logic is implemented in vanilla JavaScript, highlighting how core CS concepts can be applied without relying on external libraries.

These techniques make AlgoPaint a great reference for learning and demonstrating fundamental algorithms and data structures in a hands-on, interactive way.

## 🕹️ How to Use

1.  Goto `[github.nunusavi.io/algo-paint](https://nunusavi.github.io/algo-paint/)` in any browser.
2.  **Set Points**:
    -   The **green** block is your start point.
    -   The **red** block is your end point.
    -   Click and drag them to move their positions.
3.  **Draw Walls**: Click or drag on empty cells to create obstacles (walls). Click on a wall to remove it.
4.  **Choose an Algorithm**: Click `BFS`, `DFS`, or `A*` to start the visualization.
5.  **Control It**:
    -   Use the sliders to adjust **grid size** and **animation speed**.
    -   `Clear Walls` to remove all obstacles.
    -   `Reset` to clear everything and start fresh.


## 🌱 Future Improvements

-   [ ] Add maze generation algorithms (e.g., Recursive Division).
-   [ ] Support weighted grids with Dijkstra’s algorithm.
-   [ ] Allow saving and loading grid states.
-   [ ] Add a comparison mode to run multiple algorithms simultaneously.
-   [ ] Implement more heuristics for A* (e.g., Diagonal Distance).
