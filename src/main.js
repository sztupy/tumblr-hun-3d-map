let controlType = 'trackball';
let displayType = 'labels';
let valuesToLoad = 'all';
let labelLoadPerTick = 10000000;
let valuesToLimit = 0;
let dimensions = 3;
let dag = false;

// load up initial configuration from the URL
if (window.location.search || window.location.hash) {
  const search = window.location.search || window.location.hash;
  if (search.indexOf('fly') != -1) {
    controlType = 'fly';
  } else if (search.indexOf('orbit') != -1) {
    controlType = 'orbit';
  } else if (search.indexOf('trackball') != -1) {
    controlType = 'trackball';
  }

  if (search.indexOf('labels') != -1) {
    displayType = 'labels';
    labelLoadPerTick = 10000000;
  } else if (search.indexOf('loader') != -1) {
    displayType = 'labels';
    labelLoadPerTick = 2500;
  } else if (search.indexOf('spheres') != -1) {
    displayType = 'spheres';
    labelLoadPerTick = 100;
  }

  if (search.indexOf('all') != -1) {
    valuesToLoad = 'all';
    valuesToLimit = 0;
  } else if (search.indexOf('recent') != -1) {
    valuesToLoad = '2021';
    valuesToLimit = 0;
  } else if (search.indexOf('minimal') != -1) {
    valuesToLoad = 'all';
    valuesToLimit = 50;
  }

  if (search.indexOf('2d') != -1) {
    dimensions = 2;
  } else if (search.indexOf('3d') != -1) {
    dimensions = 3;
  }

  if (search.indexOf('dag') != -1) {
    dag = 'zin';
  } else if (search.indexOf('rad') != -1) {
    dag = 'radialin';
  } else if (search.indexOf('dar') != -1) {
    dag = 'radialout';
  }
} else {
  throw new Error();
}

const linkData = [];
const availableBlogIds = new Set();
let maxMaxValue = 0;
const yearData = tumblrData.years[valuesToLoad];
const present = {};

// initial graph loading, only loading nodes and edges above a certain threshold
for (var sourceBlog in yearData) {
  let sourceData = yearData[sourceBlog];
  let maxValue = 0;
  let maxDestination = null;
  availableBlogIds.add(parseInt(sourceBlog));
  for (var destinationBlog in sourceData) {
    let destinationData = sourceData[destinationBlog];
    availableBlogIds.add(parseInt(destinationBlog));
    if (destinationData[1] > maxValue && destinationData[1] >= valuesToLimit) {
      maxValue = destinationData[1];
      maxDestination = destinationBlog;
    }
  }

  if (maxDestination) {
    let destinationBlog = maxDestination;
    let destinationData = sourceData[destinationBlog];
    const source = parseInt(sourceBlog);
    const destination = parseInt(destinationBlog);

    present[source] ||= 1;
    present[destination] ||= 1;

    if (present[destination] < maxValue) {
      present[destination] = maxValue;
      if (maxMaxValue < maxValue) {
        maxMaxValue = maxValue;
      }
    }

    if (dag) {
      const original = linkData.find(link => link.source == destination && link.target == source);
      if (original) {
        original.linkDirection = 'both';
      } else {
        linkData.push({ source: source, target: destination, distance: (1/destinationData[0])* 30, data: destinationData});
      }
    } else {
      linkData.push({ source: source, target: destination, distance: (1/destinationData[0])* 30, data: destinationData});
    }
  }
}

const nodeData = tumblrData.nodes.map((name, idx) => ({ id: idx, name: name, val: present[idx] || 1 })).filter(data => present[data.id]);

const availableBlogs = Array.from(availableBlogIds).map(id => ({ id: id, name: tumblrData.nodes[id] })).sort((a,b) => a.name < b.name ? -1 : 1);

const initData = {
  nodes: nodeData,
  links: linkData
};

// add a new node to the graph focused on the selection. It will add all nodes regardless of the current valuesToLimit setting
function addToSystem(focusBlogId) {
  let changed = false;
  let focusBlog = initData.nodes.find(node => node.id == focusBlogId);
  if (!focusBlog) {
    focusBlog = { id: focusBlogId, name: tumblrData.nodes[focusBlogId], val: 1, x: 1, y: 1, z: 0, neighborsTo: new Set(), neighborsFrom: new Set(), links: new Set() };
    nodeData.push(focusBlog);
    changed = true;
  }
  for (var sourceBlog in yearData) {
    const sourceData = yearData[sourceBlog];
    const source = parseInt(sourceBlog);

    let maxValue = 0;
    let maxDestination = null;

    for (var destinationBlog in sourceData) {
      const destinationData = sourceData[destinationBlog];
      if (destinationData[1] > maxValue) {
        maxValue = destinationData[1];
        maxDestination = destinationBlog;
        if (maxMaxValue < maxValue) {
          maxMaxValue = maxValue;
        }
      }
    }

    if (maxDestination) {
      const destinationBlog = maxDestination;
      const destinationData = sourceData[destinationBlog];
      const destination = parseInt(destinationBlog);
      if (destination !== focusBlogId && source !== focusBlogId) {
        continue;
      }

      let sourceNode = nodeData.find(node => node.id == source);
      if (!sourceNode) {
        sourceNode = { id: source, name: tumblrData.nodes[source], val: 1, x: focusBlog.x, y: focusBlog.y, z: focusBlog.z };
        nodeData.push(sourceNode);
        changed = true;
      }

      let destinationNode = nodeData.find(node => node.id == destination);
      if (!destinationNode) {
        destinationNode = { id: destination, name: tumblrData.nodes[destination], val: 1, x: focusBlog.x, y: focusBlog.y, z: focusBlog.z};
        nodeData.push(destinationNode);
        changed = true;
      }

      if (destinationNode.value < maxValue) {
        destinationNode.value = maxValue;
        destinationNode.spriteNormal = null;
        destinationNode.spriteSelected = null;
      }

      if (linkData.find(link => link.source.id == source && link.target.id == destination)) {
        continue;
      };

      let newLink = null;
      if (dag) {
        const original = linkData.find(link => link.source.id == destination && link.target.id == source);
        if (original) {
          if (original.linkDirection != 'both') {
            original.linkDirection = 'both';
            changed = true;
          }
        } else {
          newLink = { source: sourceNode, target: destinationNode, distance: (1/destinationData[0])* 30, data: destinationData};
        }
      } else {
        newLink = { source: sourceNode, target: destinationNode, distance: (1/destinationData[0])* 30, data: destinationData };
      }

      if (newLink) {
        linkData.push(newLink);
        changed = true;
      }
    }
  }
  if (changed) {
    fillNeighbours();
    Graph.graphData(initData);
  }

  return changed;
}

// set up internal information in the nodes for easier processing of selections
function fillNeighbours() {
  initData.links.forEach(link => {
    const a = Number.isInteger(link.source) ? initData.nodes.find(node => link.source == node.id) : link.source;
    const b = Number.isInteger(link.target) ? initData.nodes.find(node => link.target == node.id) : link.target;

    !a.neighborsTo && (a.neighborsTo = new Set());
    !a.neighborsFrom && (a.neighborsFrom = new Set());
    !b.neighborsTo && (b.neighborsTo = new Set());
    !b.neighborsFrom && (b.neighborsFrom = new Set());
    a.neighborsTo.add(b);
    b.neighborsFrom.add(a);

    !a.links && (a.links = new Set());
    !b.links && (b.links = new Set());
    a.links.add(link);
    b.links.add(link);
  });
}
fillNeighbours();

const elem = document.getElementById('3d-graph');

const highlightLinks = new Set();
const highlightLinksTo = new Set();
const highlightLinksBoth = new Set();
const hightlightNodes = new Set();

let hoverNode = null;

// set up the Graph object
const Graph = ForceGraph3D({ controlType: controlType })(elem)

window.onload = function() {
  Graph.enableNodeDrag(false)
    .linkColor(getLinkColor)
    .linkLabel(link => `${link.source.name} -> ${link.target.name} (${link.data[0]}, ${link.data[1]})`)
    .linkWidth(link => highlightLinks.has(link) ? 1 + link.data[1] / maxMaxValue * 8 : 0)
    .linkDirectionalParticles(link => highlightLinks.has(link) ? 4 : 0)
    .linkDirectionalParticleWidth(0.5)
    .linkOpacity(1)
    .nodeResolution(1)
    .nodeLabel(node => node.name)
    .numDimensions(dimensions)
    .nodeThreeObject(getNodeObject)
    .onNodeClick(onNodeClick)
    .onLinkClick(link => onNodeClick(link.source))
    .graphData(initData);

  if (dag) {
    Graph.dagMode(dag).onDagError(function(n) { console.log('Error in DAG: ', n)});
  }
};

const ForceLink = Graph
  .d3Force('link')
  .distance(link => link.distance);

const ForceCharge = Graph
  .d3Force('charge')
  .strength(-50);

const ForceCenter = Graph.d3Force('center').strength(0.01);

// handle the search functionality
const searchBoxOpener = document.getElementById("search-open");
searchBoxOpener.onclick = function() {
  searchBox.style.display = "block";
  searchBoxOpener.style.display = "none";
}

const searchBox = document.getElementById("search-values");
for (let blog of availableBlogs) {
  const child = document.createElement("a");
  child.href="#";
  child.textContent = blog.name;
  child.onclick = (event) => {
    onNodeClick(blog.id);
    searchBox.style.display = "none";
    searchBoxOpener.style.display = "block";
    event.preventDefault();
  }
  searchBox.appendChild(child);
}

// zoom to a specific node
function zoomTo(node, speed = 1000) {
  const distance = Math.sqrt(Math.sqrt(node.val)) / Math.sqrt(Math.sqrt(maxMaxValue)) * 500;
  const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);

  const newPos = node.z
    ? { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }
    : { x: node.x, y: node.y, z: distance }; // special case if node is on the plane for 2D graphs

  Graph.cameraPosition(newPos, node, speed);
}

// run the autoFocus handler, that will make sure the camera is positioned nicely on the object that should be
// focused on, until there is any keyboard, mouse or touch activity
let autoFocus = 'all';
function runZoom() {
  if (autoFocus == 'all') {
    Graph.zoomToFit(400);
    setTimeout(runZoom, 1000);
  } else if (Number.isInteger(autoFocus)) {
    const node = nodeData.find(n => n.id == autoFocus);
    if (node) {
      zoomTo(node, 1000);
    }

    setTimeout(runZoom, 1500);
  } else {
    setTimeout(runZoom, 500);
  }
}
runZoom();
window.addEventListener('keydown', function () { autoFocus = false; }, { passive: true });
window.addEventListener('pointerdown', function () { autoFocus = false; }, { passive: true });
window.addEventListener('wheel', function (event) { if (Math.abs(event.deltaY)>1 || Math.abs(event.deltaX)>1) autoFocus = false; }, { passive: true });

// Firefox mobile doesn't load in full screen, need the following to force it to load properly
Graph.onEngineTick(function() {
  if (/Mozilla.+Android.+Mobile.+Firefox\//.test(navigator.userAgent)) {
    Graph.width(document.body.clientWidth);
    Graph.height(document.body.clientHeight);
  }
  Graph.onEngineTick(function(){});
});

// handle the "loading" style label display system, that should allow some devices to load up larger graphs
let labelDone = 0;
let labelSkipped = 0;
setTimeout(function updateLabels() {
  if (labelSkipped > 0) {
    updateHighlight();
  } else {
    setTimeout(function() { document.getElementById("loading").style.opacity = "0";},1);
    setTimeout(function() { document.getElementById("loading").style.display = "none";},1100);
  }
  labelDone = 0;
  labelSkipped = 0;
  setTimeout(updateLabels, 1000);
}, 1000);

// handle resize events to make sure the screen keeps it's normal size
window.addEventListener('resize', function() {
  Graph.width(document.body.clientWidth);
  Graph.height(document.body.clientHeight);
});

// handle clicking on nodes, including both opening up the node, and making it the selected one
function onNodeClick(node) {
  let nodeAdded = false;
  if (Number.isInteger(node)) {
    let nodeData = initData.nodes.find(n => n.id == node);
    if (!nodeData) {
      nodeAdded = addToSystem(node);
      node = initData.nodes.find(n => n.id == node);
    } else {
      node = nodeData;
    }
  }

  if (node && hoverNode === node) {
    nodeAdded = addToSystem(node.id);
  }

  if (!node.z) {
    node.z = 0;
  }

  zoomTo(node, 1000);
  autoFocus = node.id;

  if (!node && !highlightLinks.size) return;
  if (node && hoverNode === node && !nodeAdded) return;

  hightlightNodes.clear();
  highlightLinks.clear();
  highlightLinksTo.clear();
  highlightLinksBoth.clear();
  if (node) {
    hightlightNodes.add(node);
    node.neighborsTo.forEach(node => hightlightNodes.add(node));
    node.neighborsFrom.forEach(node => hightlightNodes.add(node));
    node.links.forEach(link => highlightLinks.add(link));
    Array.from(node.links).filter(link => link.source == node).forEach(link => link.target.neighborsTo.has(node) ? highlightLinksBoth.add(link) : highlightLinksTo.add(link));
    Array.from(node.links).filter(link => link.target == node).forEach(link => link.source.neighborsFrom.has(node) ? highlightLinksBoth.add(link) : null);
  }

  hoverNode = node || null;

  updateHighlight();
}

// generate label for a node for a specific color
function getSprite(node, color) {
  let sprite = new SpriteText(node.name);
  sprite.backgroundColor = color;
  sprite.color = "black";
  sprite.textHeight = 1 + Math.sqrt(node.val) / Math.sqrt(maxMaxValue) * 40;
  sprite.padding = 0.5;
  sprite.borderWidth = 0.2;
  sprite.borderColor = "black";

  return sprite;
}

// obtain how to display the specific node. Has some extra settings to allow lazy loading of labels for larger graphs
function getNodeObject(node) {
  let result = false;

  if (!node.spriteNormal && (displayType=='labels' || hightlightNodes.has(node))) {
    if (labelDone<labelLoadPerTick) {
      node.spriteNormal = getSprite(node, "white");
      labelDone++;
    } else {
      labelSkipped++;
    }
  }

  if (node.spriteNormal && (displayType=='labels' || hightlightNodes.has(node))) {
    result = node.spriteNormal;
  }

  if (!node.spriteSelected && (displayType == 'labels' && hightlightNodes.has(node))) {
    if (labelDone<labelLoadPerTick) {
      node.spriteSelected = getSprite(node, "green");
      labelDone++;
    } else {
      labelSkipped++;
    }
  }

  if (node.spriteSelected && (displayType == 'labels' && hightlightNodes.has(node))) {
    result = node.spriteSelected;
  }

  return result;
}

// obtain the color of the link
function getLinkColor(link)
{
  if (link.linkDirection == 'both') {
    return 'rgba(255,0,0,0.2)';
  }
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
}

// trigger update of highlighted objects in scene
function updateHighlight() {
  Graph
    .linkColor(Graph.linkColor())
    .linkWidth(Graph.linkWidth())
    .nodeThreeObject(Graph.nodeThreeObject())
    .linkDirectionalParticles(Graph.linkDirectionalParticles());
}
