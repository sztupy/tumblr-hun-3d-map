let controlType = 'orbit';
let displayType = 'spheres';
let valuesToLoad = 'all';
let graphType = 'topblog';
let topElems = 1;
let labelLoadPerTick = 2500;
let valuesToLimit = 50;
let dimensions = 3;
let dag = false;

// load up initial configuration from the URL
if (window.location.search) {
  const search = window.location.search.slice(1, window.location.search.length).split('-');

  console.log(search);
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

  if (search.indexOf('full') != -1) {
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

  let topblog;
  if (topblog = search.find(name => name.startsWith('topblog'))) {
    graphType = 'topblog';
    topElems = 1;
    let match;
    if (match = topblog.match(/topblog_(\d+)/)) {
      topElems = parseInt(match[1]);
      if (topElems<=0 || topElems>100) {
        topElems = 1;
      }
    }
  }
} else {
  throw new Error();
}

const linkData = [];
const nodeData = [];
const links = {};
const nodes = {};

const initData = {
  nodes: nodeData,
  links: linkData
};

const availableBlogIds = new Set();
let maxMaxValue = 0;
const yearData = tumblrData.years[valuesToLoad];
const present = {};

// loads a node from the tumblr database into the graph system
function getSystemNode(id) {
  if (nodes[id]) {
    return [false, nodes[id]];
  }

  let newNode = {
    id: id,
    name: tumblrData.nodes[id],
    val: 1,
    neighborsTo: new Set(),
    neighborsFrom: new Set(),
    links: new Set()
  };

  nodes[id] = newNode;
  nodeData.push(newNode);

  let element = document.getElementById(`blog-${id}`);
  if (element) {
    element.classList.add('top-blog');
  }

  return [true, newNode];
}

function getSystemLink(source, target, data) {
  let sourceId = Number.isInteger(source) ? source : source.id;
  let targetId = Number.isInteger(target) ? target : target.id;

  if (links[source] && links[source][target]) {
    return [false, links[source][target]];
  }

  let changed, sourceNode, targetNode;
  [changed, sourceNode] = getSystemNode(sourceId);
  [changed, targetNode] = getSystemNode(targetId);

  let newLink = {
    source: sourceNode,
    target: targetNode,
    distance: (1/data[0]) * 300,
    strength: data[0],
    data: data
  };

  sourceNode.neighborsTo.add(targetNode);
  targetNode.neighborsFrom.add(sourceNode);
  sourceNode.links.add(newLink);
  targetNode.links.add(newLink);

  links[sourceId] ||= {};
  links[sourceId][targetId] = newLink;

  linkData.push(newLink);

  return [true, newLink];
}

// add a new node to the graph focused on the selection. It will add all nodes regardless of the current valuesToLimit setting
function addToSystem(focusBlogId, options = {}) {
  options.valuesToLimit ||= 0;

  let changed = false;
  for (var sourceBlog in yearData) {
    const sourceData = yearData[sourceBlog];
    const source = parseInt(sourceBlog);
    availableBlogIds.add(source);

    let destinations = [];

    for (var destinationBlog in sourceData) {
      const destinationData = sourceData[destinationBlog];
      const destination = parseInt(destinationBlog);
      availableBlogIds.add(destination);

      destinations.push({id: destination, blog: destinationBlog, value: destinationData[1]});
    }

    destinations.sort((a, b) => b.value - a.value);
    if (options.valuesToLimit > 0) {
      destinations = destinations.filter((d) => d.value >= options.valuesToLimit);
    }
    destinations = destinations.slice(0, topElems);

    for (destData of destinations) {
      const destinationBlog = destData.blog;
      const destinationData = sourceData[destinationBlog];
      const destination = parseInt(destinationBlog);
      if (focusBlogId !== null && destination !== focusBlogId && source !== focusBlogId) {
        continue;
      }

      let [changedSource, sourceNode] = getSystemNode(source);
      let [changedDestination, destinationNode] = getSystemNode(destination);

      changed = changed || changedSource || changedDestination;

      if (destinationNode.val < destData.value) {
        destinationNode.val = destData.value;
        destinationNode.spriteNormal = null;
        destinationNode.spriteSelected = null;

        if (maxMaxValue < destData.value) {
          maxMaxValue = destData.value;
        }
      }

      if (links[source] && links[source][destination]) {
        continue;
      };

      const original = links[destination] && links[destination][source];
      if (original) {
        if (original.linkDirection != 'both') {
          original.linkDirection = 'both';
          changed = true;
          if (!dag) getSystemLink(source, destination, destinationData);
        }
      } else {
        getSystemLink(source, destination, destinationData);
        changed = true;
      }
    }
  }
  if (changed && !options.skipUpdate) {
    Graph.graphData(initData);
  }

  return changed;
}

// initial graph loading, only loading nodes and edges above a certain threshold
addToSystem(null, { valuesToLimit: valuesToLimit, skipUpdate: true });

const availableBlogs = Array.from(availableBlogIds).map(id => ({ id: id, name: tumblrData.nodes[id] })).sort((a,b) => a.name < b.name ? -1 : 1);

const elem = document.getElementById('3d-graph');

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
  .distance(link => link.distance)
 // .strength(link => 1 - link.strength / maxMaxValue * 0.8);

const ForceCharge = Graph
  .d3Force('charge')
  .strength(-50);

const ForceCenter = Graph.d3Force('center').strength(0.01);

// handle the controls on the right
const controls = document.getElementById("controls");

document.getElementById("zoom-out").onclick = function() {
  autoFocus = 'all';
}

const searchBoxOpener = document.getElementById("search-open");
searchBoxOpener.onclick = function() {
  searchBox.style.display = "flex";
  controls.style.display = "none";
}

const searchBox = document.getElementById("search");
const searchValues = document.getElementById("search-values");

for (let i = 0; i < 37; i++) {
  var child = document.createElement("a");
  let char = i < 36 ? i.toString(36) : 'top';
  child.href = "#";
  child.innerHTML = char + " ";
  child.style.display = "inline";
  child.onclick = function() {
    let element = document.getElementById(`alphabet-${char}`);
    if (element) {
      console.log(element);
      element.scrollIntoView(true);
    }
  }
  document.getElementById("search-alphabet").appendChild(child);
  if (i%10 == 9) {
    document.getElementById("search-alphabet").appendChild(document.createElement("br"));
  }
}

// top blogs
let topBlogs = availableBlogs.map(blog => {
  let node = nodeData.find(node => node.id == blog.id);
  return { name: blog.name, value: node ? node.val : 0, id: blog.id };
}).sort((a,b) => b.value - a.value).slice(0,50).sort((a,b) => a.name > b.name ? 1 : -1);

for (let blog of topBlogs) {
  const child = document.createElement("a");
  child.href="#";
  child.textContent = blog.name;
  child.id=`top-blog-${blog.id}`;
  child.classList.add("top-blog");
  child.onclick = (event) => {
    onNodeClick(blog.id);
    searchBox.style.display = "none";
    controls.style.display = "block";
    event.preventDefault();
  }
  searchValues.appendChild(child);
}

let oldChar = null;
for (let blog of availableBlogs) {
  const child = document.createElement("a");
  child.href="#";
  child.id=`blog-${blog.id}`;
  child.textContent = blog.name;
  if (nodeData.find(node => node.id == blog.id)) {
    child.classList.add("top-blog");
  }
  child.onclick = (event) => {
    onNodeClick(blog.id);
    searchBox.style.display = "none";
    controls.style.display = "block";
    event.preventDefault();
  }
  if (oldChar != blog.name.charAt(0)) {
    oldChar = blog.name.charAt(0);
    child.id = `alphabet-${oldChar}`;
  }
  searchValues.appendChild(child);
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

const highlightLinks = new Set();
const highlightLinksTo = new Set();
const highlightLinksBoth = new Set();
const hightlightNodes = new Set();
let hoverNode = null;

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
  sprite.textHeight = (1 + Math.sqrt(node.val) / Math.sqrt(maxMaxValue) * 30)/10;
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
    if (highlightLinksBoth.has(link)) {
      return 'rgba(255,0,0,0.8)';
    } else {
      return 'rgba(255,0,0,0.2)';
    }
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
