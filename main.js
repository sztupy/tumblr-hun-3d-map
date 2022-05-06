const present = {};

let controlType = 'trackball';
let displayType = 'labels';
let valuesToLoad = 'all';
let valuesToLimit = 0;

if (window.location.search) {
  console.log(window.location.search);
  if (window.location.search.indexOf('fly') != -1) {
    controlType = 'fly';
  } else if (window.location.search.indexOf('orbit') != -1) {
    controlType = 'orbit';
  } else if (window.location.search.indexOf('trackball') != -1) {
    controlType = 'trackball';
  }

  if (window.location.search.indexOf('labels') != -1) {
    displayType = 'labels';
  } else if (window.location.search.indexOf('spheres') != -1) {
    displayType = 'spheres';
  }

  if (window.location.search.indexOf('all') != -1) {
    valuesToLoad = 'all';
    valuesToLimit = 0;
  } else if (window.location.search.indexOf('recent') != -1) {
    valuesToLoad = '2021';
    valuesToLimit = 0;
  } else if (window.location.search.indexOf('minimal') != -1) {
    valuesToLoad = 'all';
    valuesToLimit = 20;
  }
} else {
  throw new Error();
}




const linkData = [];
let maxMaxValue = 0;
let yearData = tumblrData.years[valuesToLoad];
for (var sourceBlog in yearData) {
  let sourceData = yearData[sourceBlog];
  let maxValue = 0;
  for (var destinationBlog in sourceData) {
    let destinationData = sourceData[destinationBlog];
    if (destinationData[1] > maxValue) {
      maxValue = destinationData[1];
    }
  }
   if (maxValue < valuesToLimit) {
     maxValue = 0;
   }

  for (var destinationBlog in sourceData) {
    let destinationData = sourceData[destinationBlog];

    if ( destinationData[1] == maxValue ) {
      present[parseInt(sourceBlog)] ||= 1;
      present[parseInt(destinationBlog)] ||= 1;

      if (present[parseInt(destinationBlog)] < maxValue) {
        present[parseInt(destinationBlog)] = maxValue;
        if (maxMaxValue < maxValue) {
          maxMaxValue = maxValue;
        }
      }

      linkData.push({ source: parseInt(sourceBlog), target: parseInt(destinationBlog), distance: (1/destinationData[0])* 30, data: destinationData});
      break;
    }
  }
}

const nodeData = tumblrData.nodes.map((name, idx) => ({ id: idx, name: name, val: present[idx] || 1 })).filter(data => present[data.id]);

const initData = {
  nodes: nodeData,
  links: linkData
};

initData.links.forEach(link => {
  const a = initData.nodes.find(node => link.source == node.id);
  const b = initData.nodes.find(node => link.target == node.id);

  !a.neighborsTo && (a.neighborsTo = []);
  !a.neighborsFrom && (a.neighborsFrom = []);
  !b.neighborsTo && (b.neighborsTo = []);
  !b.neighborsFrom && (b.neighborsFrom = []);
  a.neighborsTo.push(b);
  b.neighborsFrom.push(a);

  !a.links && (a.links = []);
  !b.links && (b.links = []);
  a.links.push(link);
  b.links.push(link);
});

const elem = document.getElementById('3d-graph');

const highlightLinks = new Set();
const highlightLinksTo = new Set();
const highlightLinksBoth = new Set();
const hightlightNodes = new Set();

let hoverNode = null;

const Graph = ForceGraph3D({ controlType: controlType })(elem)
  .enableNodeDrag(false)
  .linkColor(link => {
      if (highlightLinks.has(link)) {
        if (highlightLinksBoth.has(link)) {
          return 'rgba(255,0,0,0.8)';
        }
        if (highlightLinksTo.has(link)) {
          return 'rgba(255,255,0,0.5)';
        }
        return 'rgba(0,255,0,0.5)';
      }
      return 'rgba(255,255,255,0.2)';
  })
  .linkLabel(link => `${link.source.name} -> ${link.target.name} (${link.data[0]}, ${link.data[1]})`)
  .linkWidth(link => highlightLinks.has(link) ? 0.5 : 0)
  .linkDirectionalParticles(link => highlightLinks.has(link) ? 4 : 0)
  .linkDirectionalParticleWidth(0.5)
  .linkOpacity(1)
  .nodeResolution(1)
  .nodeLabel(node => node.name)
  .numDimensions(3)
  .nodeThreeObject(node => {
    if (!node.spriteWhite && (displayType=='labels' || hightlightNodes.has(node))) {
      let sprite = new SpriteText(node.name);
      sprite.backgroundColor = "white";
      sprite.color = "black";
      sprite.textHeight = 1 + Math.sqrt(node.val) / Math.sqrt(maxMaxValue) * 40;
      sprite.padding = 0.5;
      sprite.borderWidth = 0.2;
      sprite.borderColor = "black";

      node.spriteWhite = sprite;
    }

    if (!node.spriteGreen && (displayType == 'labels' && hightlightNodes.has(node))) {
      sprite = new SpriteText(node.name);
      sprite.backgroundColor = "green";
      sprite.color = "black";
      sprite.textHeight = 1 + Math.sqrt(node.val) / Math.sqrt(maxMaxValue) * 40;
      sprite.padding = 0.5;
      sprite.borderWidth = 0.2;
      sprite.borderColor = "black";

      node.spriteGreen = sprite;
    }

    return hightlightNodes.has(node) ? (displayType == 'labels' ? node.spriteGreen : node.spriteWhite ) : (displayType == 'labels' ? node.spriteWhite : false);
  })
  .onNodeClick(node => onNodeClick(node))
  .onLinkClick(link => onNodeClick(link.source))
  .graphData(initData);

const ForceLink = Graph
  .d3Force('link')
  .distance(link => link.distance);

const ForceCharge = Graph
  .d3Force('charge')
  .strength(-50);

const ForceCenter = Graph.d3Force('center').strength(0.01);

let stopped = false;
Graph.onEngineStop(() => stopped = true);

function runZoom() {
  Graph.zoomToFit(400);
  if (!stopped)
    setTimeout(runZoom, 1000);
}

runZoom();

// Firefox mobile doesn't load in full screen, need the following to force it to load properly
if (/Mozilla.+Android.+Mobile.+Firefox\//.test(navigator.userAgent)) {
  Graph.width(document.body.clientWidth);
  Graph.height(document.body.clientHeight);
}

function onNodeClick(node) {
  const distance = 100;
  const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);

  const newPos =
  // { x: node.x, y: node.y, z: 1000 };
  node.x || node.y || node.z
    ? { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }
    : { x: 0, y: 0, z: distance }; // special case if node is in (0,0,0)

  Graph.cameraPosition(
    newPos, // new position
    node, // lookAt ({ x, y, z })
    3000  // ms transition duration
  );

  if (controlType == 'fly') {
    setTimeout(function() {
      Graph.cameraPosition(
        newPos, // new position
        node, // lookAt ({ x, y, z })
        3000  // ms transition duration
      )
    },3500);
  }

  if ((!node && !highlightLinks.size) || (node && hoverNode === node)) return;

  hightlightNodes.clear();
  highlightLinks.clear();
  highlightLinksTo.clear();
  highlightLinksBoth.clear();
  if (node) {
    hightlightNodes.add(node);
    node.neighborsTo.forEach(node => hightlightNodes.add(node));
    node.neighborsFrom.forEach(node => hightlightNodes.add(node));
    node.links.forEach(link => highlightLinks.add(link));
    node.links.filter(link => link.source == node).forEach(link => link.target.neighborsTo.includes(node) ? highlightLinksBoth.add(link) : highlightLinksTo.add(link));
    node.links.filter(link => link.target == node).forEach(link => link.source.neighborsFrom.includes(node) ? highlightLinksBoth.add(link) : null);
  }

  hoverNode = node || null;

  updateHighlight();
}

function updateHighlight() {
  // trigger update of highlighted objects in scene
  Graph
    .linkColor(Graph.linkColor())
    .linkWidth(Graph.linkWidth())
    .nodeThreeObject(Graph.nodeThreeObject())
    .linkDirectionalParticles(Graph.linkDirectionalParticles());
}
