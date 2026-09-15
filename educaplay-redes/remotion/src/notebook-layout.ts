// Separate experiment: the approved composition keeps its original layout.
export const NOTEBOOK = {
  id: 'EducaPlayCuaderno',
  frames: 375,
  card: {x: 90, y: 300, width: 840, height: 680},
  captions: {x: 90, y: 1010, width: 840, height: 184},
  // Coordinates belong to this shared stage, never to the episode data.
  stripe: {height: 12},
  pages: [
    {from: 0, to: 97, color: 0},
    {from: 97, to: 189, color: 1},
    {from: 189, to: 331, color: 2},
    {from: 331, to: 375, color: 3},
  ],
};
