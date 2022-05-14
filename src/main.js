const settings = {
  controlType: 'orbit',
  displayType: 'top50',
  graphType: 'topblog',
  topElems: 1,
  labelLoadPerTick: 10000000,
  valuesToLimit: 50,
  valuesToLoad: ["2019","2020","2021","current"],
  dimensions: 3,
  dag: false,
  colorLinks: false,
  colorNodes: false
}

const search = window.location.search ? window.location.search.slice(1, window.location.search.length).split('-') : [];
const settingConfig = {};

function updateSettings() {
  let result = [];
  let form = document.forms[0];
  for (let name in settingConfig) {
    let map = settingConfig[name];
    result.push(map[form[name].value]);
  }
  return result.join('-');
}

function setupSearch(mapping, settingName, formElement, formFunction) {
  let value = settings[settingName];
  for (let name in mapping) {
    let result;
    if (result = search.find(s => s == name || s.startsWith(name+"_"))) {
      settings[settingName] = mapping[name];
      value = mapping[name];
      break;
    }
  }

  settingConfig[formElement] = Object.fromEntries(Object.entries(mapping).map(([key, value]) => [value, key]));

  document.getElementsByName(formElement).forEach(e => {
    e.onchange = (e) => {
      let result = formFunction(e);
      let newSettings = updateSettings();
      if (result == 'redirect') {
        window.location.replace("test.html?" + newSettings);
      } else {
        window.history.replaceState(null,'',"test.html?"+newSettings);
      }
    }

    if (e.value === value+"") {
      e.checked = true;
    }
  });
}

setupSearch({ fly: 'fly', orbit: 'orbit', trackball: 'trackball'}, 'controlType', 'control_type', (e) => {
  Graph.setNewControls(e.target.value);
});
setupSearch({ labels: 'labels', top50: 'top50', spheres: 'spheres'}, 'displayType', 'display_type', (e) => {
  settings.displayType = e.target.value;
  if (settings.displayType != 'labels') {
    nodeData.forEach(node => { if (node.sprite) { node.sprite.material.map.dispose(); node.sprite.material.dispose(); node.sprite = null; } });
  }
  updateHighlight();
});
setupSearch({ full: 0, limited: 25, minimal: 50 }, 'valuesToLimit', 'values_to_limit', (e) => {
  settings.valuesToLimit = parseInt(e.target.value);

});

// load up initial configuration from the URL
if (window.location.search) {
  if (search.indexOf('2d') != -1) {
    settings.dimensions = 2;
  } else if (search.indexOf('3d') != -1) {
    settings.dimensions = 3;
  }

  if (search.indexOf('dag') != -1) {
    settings.dag = 'zin';
  } else if (search.indexOf('rad') != -1) {
    settings.dag = 'radialin';
  } else if (search.indexOf('dar') != -1) {
    settings.dag = 'radialout';
  }

  if (search.indexOf('colorlinks') != -1) {
    settings.colorLinks = true;
  } else if (search.indexOf('bwlinks') != -1) {
    settings.colorLinks = false;
  }
  let checkboxColorLinks = document.getElementById('s-colorlinks');
  checkboxColorLinks.checked = settings.colorLinks;
  checkboxColorLinks.oninput = function(e) {
    settings.colorLinks = e.target.checked;
    updateHighlight();
    updateSettings();
  }

  if (search.indexOf('colornodes') != -1) {
    settings.colorNodes = true;
  } else if (search.indexOf('bwnodes') != -1) {
    settings.colorNodes = false;
  }
  let checkboxColorNodes = document.getElementById('s-colornodes');
  checkboxColorNodes.checked = settings.colorNodes;
  checkboxColorNodes.oninput = function(e) {
    settings.colorNodes = e.target.checked;
    updateHighlight();
    updateSettings();
  }


  let years;
  if (years = search.find(name => name.startsWith('years'))) {
    let load = [];
    years.split('_').forEach(year => {
      if (parseInt(year)>=10 && parseInt(year)<22)
        load.push("20"+year);
      if (parseInt(year)==22)
        load.push('current');
    });

    if (load.length > 0) {
      settings.valuesToLoad = load.filter((v, i, a) => a.indexOf(v) === i);
    }
  }

  let topblog;
  if (topblog = search.find(name => name.startsWith('topblog'))) {
    settings.graphType = 'topblog';
    settings.topElems = 1;
    let match;
    if (match = topblog.match(/topblog_(\d+)/)) {
      settings.topElems = parseInt(match[1]);
      if (settings.topElems<=0 || settings.topElems>100) {
        settings.topElems = 1;
      }
    }
  }

  let spantree;
  if (spantree = search.find(name => name.startsWith('spantree'))) {
    settings.graphType = 'spantree';
    settings.topElems = 1;
    let match;
    if (match = spantree.match(/spantree_(\d+)/)) {
      settings.topElems = parseInt(match[1]);
      if (settings.topElems<=0 || settings.topElems>100) {
        settings.topElems = 1;
      }
    }
  }
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
const allData = tumblrData.years['all'];
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
    totalVal: 1,
    neighborsTo: new Set(),
    neighborsFrom: new Set(),
    links: new Set(),
    cluster: null,
    openedDepth: null
  };

  nodes[id] = newNode;
  nodeData.push(newNode);

  let element = document.getElementById(`blog-${id}`);
  if (element) {
    element.classList.add('top-blog');
  }
  element = document.getElementById(`top-blog-${id}`);
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

let spanningEdges = [];
function generateSpanningTreeData() {
  let sortedEdges = [];
  let spanNodes = {};
  for (var sourceBlog in allData) {
    let destinationBlogs = {};
    const source = parseInt(sourceBlog);

    for (var year of settings.valuesToLoad) {
      let yearData = tumblrData.years[year];
      const sourceData = yearData[sourceBlog];
      if (!sourceData) {
        continue;
      }
      availableBlogIds.add(source);

      for (var destinationBlog in sourceData) {
        const destinationData = sourceData[destinationBlog];
        const destination = parseInt(destinationBlog);
        availableBlogIds.add(destination);

        if (destinationBlogs[destination]) {
          destinationBlogs[destination].value += destinationData[1];
          destinationBlogs[destination].data[0] += destinationData[0];
          destinationBlogs[destination].data[1] += destinationData[1];
        } else {
          destinationBlogs[destination] = {
            source: source,
            target: destination,
            value: destinationData[1],
            data: [ destinationData[0], destinationData[1] ],
            used: 0
          }
        }
      }
    }

    let destinations = Object.values(destinationBlogs);
    for (var dest of destinations) {
      sortedEdges.push(dest);
    };
  }
  sortedEdges.sort((a, b) => b.value - a.value);

  clusterNum = 0;
  for (let count = 0; count < 50; count ++) {
    for (node in spanNodes) {
      spanNodes[node].cluster = null;
    }
    for (edge of sortedEdges) {
      if (edge.used)
        continue;

      if (!spanNodes[edge.source]) {
        spanNodes[edge.source] = {
          id: edge.source,
          cluster: null,
          touches: 0
        }
      }

      if (!spanNodes[edge.target]) {
        spanNodes[edge.target] = {
          id: edge.target,
          cluster: null,
          touches: 0
        }
      }

      if ((spanNodes[edge.source].cluster === null) && (spanNodes[edge.target].cluster === null)) {
        clusterNum += 1;
        spanNodes[edge.source].cluster = clusterNum;
        spanNodes[edge.target].cluster = clusterNum;
        edge.used = count;
        spanningEdges.push(edge);
      } else if (spanNodes[edge.source].cluster === null) {
        spanNodes[edge.source].cluster = spanNodes[edge.target].cluster;
        edge.used = count;
        spanningEdges.push(edge);
      } else if (spanNodes[edge.target].cluster === null) {
        spanNodes[edge.target].cluster = spanNodes[edge.source].cluster;
        edge.used = count;
        spanningEdges.push(edge);
      } else if (spanNodes[edge.source].cluster !== spanNodes[edge.target].cluster) {
        let oldCluster = spanNodes[edge.target].cluster;
        for (var node in spanNodes) {
          if (spanNodes[node].cluster === oldCluster) {
            spanNodes[node].cluster = spanNodes[edge.source].cluster;
          }
        }
        edge.used = count;
        spanningEdges.push(edge);
      }
    }
  }
}

function addEdgeToSystem(focusBlogId, sourceBlogId, targetBlogId, value, data) {
  let destination = targetBlogId;
  let source = sourceBlogId;

  if (focusBlogId !== null && destination !== focusBlogId && source !== focusBlogId) {
    return false;
  }

  let [changedSource, sourceNode] = getSystemNode(source);
  let [changedDestination, destinationNode] = getSystemNode(destination);

  let changed = changedSource || changedDestination;

  if (links[source] && links[source][destination]) {
    return false;
  };

  destinationNode.totalVal ||= 0;
  destinationNode.totalVal += value;

  if (maxMaxValue < destinationNode.totalVal) {
    maxMaxValue = destinationNode.totalVal;
  }

  if (destinationNode.val < value) {
    destinationNode.val = value;
  }

  const original = links[destination] && links[destination][source];
  if (original) {
    if (original.linkDirection != 'both') {
      original.linkDirection = 'both';
      changed = true;
      if (!settings.dag) getSystemLink(source, destination, data);
    }
  } else {
    getSystemLink(source, destination, data);
    changed = true;
  }

  return changed;
}

function addToSystemSpan(focusBlogId, options) {
  if (settings.graphType == 'spantree' && spanningEdges.length == 0) {
    generateSpanningTreeData();
  }

  let changed = false;
  for (let edge of spanningEdges) {
    if (edge.used > options.topElems) {
      continue;
    }
    if (edge.value >= options.valuesToLimit) {
      changed |= addEdgeToSystem(focusBlogId, edge.source, edge.target, edge.value, edge.data);
    }
  }

  return changed;
}

function addToSystemTopBlog(focusBlogId, options = {}) {
  let changed = false;
  for (var sourceBlog in allData) {
    let destinationBlogs = {};
    const source = parseInt(sourceBlog);

    for (var year of settings.valuesToLoad) {
      let yearData = tumblrData.years[year];
      const sourceData = yearData[sourceBlog];
      if (!sourceData) {
        continue;
      }

      availableBlogIds.add(source);

      for (var destinationBlog in sourceData) {
        const destinationData = sourceData[destinationBlog];
        const destination = parseInt(destinationBlog);
        availableBlogIds.add(destination);

        if (destinationBlogs[destination]) {
          destinationBlogs[destination].value += destinationData[1];
          destinationBlogs[destination].data[0] += destinationData[0];
          destinationBlogs[destination].data[1] += destinationData[1];
        } else {
          destinationBlogs[destination] = {
            id: destination,
            blog: destinationBlog,
            value: destinationData[1],
            data: [ destinationData[0], destinationData[1] ]
          }
        }
      }
    }

    let destinations = Object.values(destinationBlogs);

    destinations.sort((a, b) => b.value - a.value);
    if (options.valuesToLimit > 0) {
      destinations = destinations.filter((d) => d.value >= options.valuesToLimit);
    }
    destinations = destinations.slice(0, options.topElems);

    for (destData of destinations) {
      changed |= addEdgeToSystem(focusBlogId, source, destData.id, destData.value, destData.data);
    }
  }

  return changed;
}

// add a new node to the graph focused on the selection. It will add all nodes regardless of the current settings.valuesToLimit setting
function addToSystem(focusBlogId, options = {}) {
  options.valuesToLimit ||= 0;
  options.topElems ||= settings.topElems;

  let changed = false;
  if (settings.graphType == 'spantree') {
    changed = addToSystemSpan(focusBlogId, options);
  } else {
    changed = addToSystemTopBlog(focusBlogId, options);
  }

  if (changed && !options.skipUpdate) {
    runClustering(true);
    Graph.graphData(initData);
    if (settings.dag) {
      Graph.dagMode(settings.dag);
    }
  }

  return changed;
}

function setCluster(node, cluster) {
  if (node.cluster !== null) return;

  node.cluster = cluster;
  node.neighborsFrom.forEach(n => setCluster(n, cluster));
  node.neighborsTo.forEach(n => setCluster(n, cluster));
}

function runClustering() {
  let currentCluster = 0;
  for (let node of nodeData) {
    node.cluster = null;
  }

  for (let node of nodeData) {
    if (node.cluster === null) {
      currentCluster+=1;
      setCluster(node, currentCluster);
    }
  }
}

// initial graph loading, only loading nodes and edges above a certain threshold
addToSystem(null, { valuesToLimit: settings.valuesToLimit, skipUpdate: true });
runClustering(false);

const availableBlogs = Array.from(availableBlogIds).map(id => ({ id: id, name: tumblrData.nodes[id] })).sort((a,b) => a.name < b.name ? -1 : 1);

const elem = document.getElementById('3d-graph');

// set up the Graph object
const Graph = ForceGraph3D({ controlType: settings.controlType })(elem)

window.onload = function() {
  Graph.enableNodeDrag(false)
    .linkColor(getLinkColor)
    .nodeColor(node => colorizeNode(node))
    .nodeVal(node => node.totalVal)
    .nodeRelSize(1)
    .linkLabel(link => `${link.source.name} -> ${link.target.name} (${link.data[0]}, ${link.data[1]})`)
    .linkWidth(link => highlightLinks.has(link) ? 1 + link.data[1] / maxMaxValue * 8 : 0)
    .linkDirectionalParticles(link => highlightLinks.has(link) ? 4 : 0)
    .linkDirectionalParticleWidth(0.5)
    .linkOpacity(1)
    .nodeResolution(1)
    .nodeLabel(getNodeLabel)
    .numDimensions(settings.dimensions)
    .nodeThreeObject(getNodeObject)
    .onNodeClick(onNodeClick)
    .onLinkClick(link => onNodeClick(link.source))
    .graphData(initData);

  if (settings.dag) {
    Graph.dagMode(settings.dag).onDagError(function(n) { console.log('Error in DAG: ', n)});
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

document.getElementById("zoom-out").onclick = function(e) {
  autoFocus = 'all';
  e.preventDefault();
}

document.getElementById("gay-mode").onclick = function(e) {
  gayMode(true);
  e.preventDefault();
}

document.getElementById("reset-graph").onclick = function(e) {
  nodeData.forEach(node => {
    node.x=Math.random()*100;
    node.y=Math.random()*100;
    node.z=Math.random()*100;
  });
  Graph.graphData(initData);
  e.preventDefault();
}

document.getElementById("reheat-graph").onclick = function(e) {
  Graph.d3ReheatSimulation();
  e.preventDefault();
}

document.getElementById("open-stats").onclick = function(e) {
  document.getElementById("stats").style.display = "flex";
  controls.style.display = "none";
  e.preventDefault();
}

document.getElementById("stats-exit").onclick = function(e) {
  document.getElementById("stats").style.display = "none";
  controls.style.display = "block";
  e.preventDefault();
}

document.getElementById("open-config").onclick = function(e) {
  document.getElementById("config").style.display = "flex";
  controls.style.display = "none";
  e.preventDefault();
}

document.getElementById("config-exit").onclick = function(e) {
  document.getElementById("config").style.display = "none";
  controls.style.display = "block";
  e.preventDefault();
}

const searchBoxOpener = document.getElementById("search-open");
searchBoxOpener.onclick = function(e) {
  searchBox.style.display = "flex";
  controls.style.display = "none";
  e.preventDefault();
}

const searchBox = document.getElementById("search");
const searchValues = document.getElementById("search-values");

for (let i = 0; i < 37; i++) {
  let child = document.createElement("a");
  let char = i < 36 ? i.toString(36) : 'top';
  child.href = "#";
  child.innerHTML = char + " ";
  child.style.display = "inline";
  child.onclick = function(e) {
    let element = document.getElementById(`alphabet-${char}`);
    if (element) {
      console.log(element);
      element.scrollIntoView(true);
    }
    e.preventDefault();
  }
  document.getElementById("search-alphabet").appendChild(child);
  if (i%10 == 9) {
    document.getElementById("search-alphabet").appendChild(document.createElement("br"));
  }
}

let child = document.createElement("a");
child.href = "#";
child.innerHTML = "[X]";
child.style.display = "inline";
child.onclick = function(e) {
  searchBox.style.display = "none";
  controls.style.display = "block";
  e.preventDefault();
}
document.getElementById("search-alphabet").appendChild(child);

// top blogs
let topBlogs = availableBlogs.map(blog => {
  let node = nodeData.find(node => node.id == blog.id);
  return { name: blog.name, node: node, value: node ? node.totalVal : 0, id: blog.id };
}).sort((a,b) => b.value - a.value).slice(0,50).sort((a,b) => a.name > b.name ? 1 : -1);

for (let blog of topBlogs) {
  if (!blog.node) continue;
  blog.node.topBlog = true;
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
let lastSelectedNode = null;
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
  if (Number.isInteger(node)) {
    let nodeData = initData.nodes.find(n => n.id == node);
    if (!nodeData) {
      nodeAdded = addToSystem(node);
      node = initData.nodes.find(n => n.id == node);
    } else {
      node = nodeData;
    }
  }

  hightlightNodes.clear();
  highlightLinks.clear();
  highlightLinksTo.clear();
  highlightLinksBoth.clear();
  if (node) {
    if (!node.z) {
      node.z = 0;
    }

    hightlightNodes.add(node);
    node.neighborsTo.forEach(node => hightlightNodes.add(node));
    node.neighborsFrom.forEach(node => hightlightNodes.add(node));
    node.links.forEach(link => highlightLinks.add(link));
    Array.from(node.links).filter(link => link.source == node).forEach(link => link.target.neighborsTo.has(node) ? highlightLinksBoth.add(link) : highlightLinksTo.add(link));
    Array.from(node.links).filter(link => link.target == node).forEach(link => link.source.neighborsFrom.has(node) ? highlightLinksBoth.add(link) : null);
  }

  fillNodeDetails(node);
  hoverNode = node || null;
  updateHighlight();
}

// generate label for a node for a specific color
function getSprite(node) {
  let sprite = new SpriteText(node.name);
  sprite.backgroundColor = "white";
  sprite.color = "black";
  sprite.textHeight = (1 + Math.sqrt(node.val) / Math.sqrt(maxMaxValue) * 30);
  sprite.padding = 0.5;
  sprite.borderWidth = 0.2;
  sprite.borderColor = "black";
  sprite.genCanvas();

  return sprite;
}

// obtain how to display the specific node. Has some extra settings to allow lazy loading of labels for larger graphs
function getNodeObject(node) {
  let result = false;

  if (!node.sprite && (settings.displayType=='labels' || hightlightNodes.has(node) || (settings.displayType=='top50' && node.topBlog))) {
    if (labelDone<settings.labelLoadPerTick) {
      node.sprite = getSprite(node, "white");
      labelDone++;
    } else {
      labelSkipped++;
    }
  }

  if (node.sprite) {
    result = node.sprite;
  }

  colorizeNode(node);

  return result;
}

let colorObject = TinyColor("#00ff00");

function colorizeNode(node) {
  let obj = node.sprite || node.__threeObj;

  let hsl = { h: 0, s: 0, l: 1 };

  if (hightlightNodes.has(node)) {
    if (settings.colorNodes && node.cluster) {
      hsl.h = (node.cluster % 20)/20;
      hsl.s = 1;
      hsl.l = 0.5;
    } else {
      hsl.h = 0;
      hsl.s = 0;
      hsl.l = 1;
    }
  } else {
    if (settings.colorNodes && node.cluster) {
      hsl.h = (node.cluster % 20)/20;
      hsl.s = 1;
      hsl.l = 0.75;
    } else {
      hsl.h = 0;
      hsl.s = 0;
      hsl.l = 0.5;
    }
  }

  if (obj) {
    obj.material.color.setHSL(hsl.h, hsl.s, hsl.l);
  }

  return TinyColor({h: hsl.h*360, s: hsl.s, l: hsl.l, a: 1});
}

// obtain the color of the link
function getLinkColor(link)
{
  if (link.linkDirection == 'both') {
    if (highlightLinksBoth.has(link)) {
      return 'rgba(255,0,0,0.8)';
    } else {
      return 'rgba(255,0,0,0.5)';
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
  if (settings.colorLinks && link.source.cluster) {
    return TinyColor({h: (link.source.cluster % 20)/20*360, s: 0.75, l: 0.5, a: 0.25});
  }
  return 'rgba(255,255,255,0.5)';
}

// trigger update of highlighted objects in scene
function updateHighlight() {
  Graph
    .linkColor(Graph.linkColor())
    .linkWidth(Graph.linkWidth())
    .nodeThreeObject(Graph.nodeThreeObject())
    .linkDirectionalParticles(Graph.linkDirectionalParticles());
}

let gayModeRunning = false;
function gayMode(init) {
  if (init) {
    // this will enable a hack in 3d-force-graph to disable colour caching, otherwise this would not work
    window.GAY_MODE = true;
    Graph.linkColor(Graph.linkColor());
  }

  let currentHSL = {};
  for (let nodeKey in nodes) {
    let node = nodes[nodeKey];
    if (node.__threeObj) {
      let nextHSL;
      if (init) {
        nextHSL = (((node.x+node.y+node.z)/100)%100)/100;
      } else {
        node.__threeObj.material.color.getHSL(currentHSL);
        nextHSL = currentHSL.h + 0.05;
      }

      while (nextHSL>=1) nextHSL -= 1;

      node.__threeObj.material.color.setHSL(nextHSL, 1, 0.5);
    }
  }

  for (let line of linkData) {
    if (line.__lineObj && line.source.__threeObj) {
      line.__lineObj.material.color.set(line.source.__threeObj.material.color);
    }
  }

  if (!init || !gayModeRunning) {
    gayModeRunning = true;
    setTimeout(gayMode, 100);
  }
}

function getNodeLabel(node) {
  return node.name;
}

document.getElementById("node-info-exit").onclick = (e) => { fillNodeDetails(null); onNodeClick(null); e.preventDefault(); }
// node modification tools
function fillNodeDetails(node) {
  let details = '';
  if (node) {
    details += `Name: ${node.name} <br>`;
    details += `Strength: ${node.val} (${node.totalVal})<br>`;
    details += `Cluster: ${node.cluster} <br>`;
    details += `Neighbours: ${node.neighborsFrom.size} / ${node.neighborsTo.size}`;

    document.getElementById('node-info-zoom').onclick = (e) => { autoFocus = node.id; e.preventDefault() };
    document.getElementById('node-info-add').onclick = (e) => { openNode(node); e.preventDefault(); };
    document.getElementById('node-info-add-all').onclick = (e) => { openNode(node, true, false); e.preventDefault(); };
    document.getElementById('node-info-delete').onclick = (e) => { deleteNode(node); e.preventDefault(); };

    document.getElementById('node-info').style.display = "block";
  } else {
    let prevDefault = (e) => { e.preventDefault() };
    document.getElementById('node-info-zoom').onclick = prevDefault;
    document.getElementById('node-info-add').onclick = prevDefault;
    document.getElementById('node-info-add-all').onclick = prevDefault;
    document.getElementById('node-info-delete').onclick = prevDefault;
    document.getElementById('node-info').style.display = "none";
  }

  document.getElementById('node-info-text').innerHTML = details;
}
fillNodeDetails(null);


function openNode(node, includeNeighbors = false, skipUpdate = false) {
  if (includeNeighbors) {
    var neighborsset = new Set(node.neighborsTo);
    node.neighborsFrom.forEach(neighbor => neighborsset.add(neighbor));
    neighborsset.forEach(neighbor => openNode(neighbor, false, true));
  }

  if (!node.openedDepth) {
    addToSystem(node.id, { skipUpdate: skipUpdate });
    node.openedDepth = 1;
  } else {
    node.openedDepth+=1;
    addToSystem(node.id, { topElems: node.openedDepth, skipUpdate: skipUpdate });
  }
  if (!skipUpdate)
    onNodeClick(node);

  if (includeNeighbors) {
    runClustering();
    Graph.graphData(initData);
    updateHighlight();
  }
}

function deleteNode(node) {
  if (!node) return;
  let element;
  element = document.getElementById(`top-blog-${node.id}`);
  if (element) element.classList.remove('top-blog');

  element = document.getElementById(`blog-${node.id}`);
  if (element) element.classList.remove('top-blog');

  node.links.forEach(link => {
    link.source.links.delete(link);
    link.target.links.delete(link);

    link.source.neighborsTo.delete(link.target);
    link.target.neighborsFrom.delete(link.source);

    delete links[link.source.id][link.target.id];
    linkData.splice(linkData.indexOf(link), 1);
  });

  delete nodes[node.id];
  nodeData.splice(nodeData.indexOf(node),1);

  Graph.graphData(initData);
  if (settings.dag) {
    Graph.dagMode(settings.dag);
  }
  runClustering();
  updateHighlight();
  fillNodeDetails(null);
}
