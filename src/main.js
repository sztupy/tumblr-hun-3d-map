const settings = {
  controlType: 'orbit',
  displayType: 'top50',
  graphType: 'topblog',
  topElems: 1,
  labelLoadPerTick: 10000000,
  valuesToLimit: 100,
  valuesToLoad: [],
  dimensions: 3,
  dag: false,
  colorLinks: false,
  colorNodes: false,
  keepOnChange: false,
  deleteOrphans: false,
  autoZoom: false,
  allowNodeMove: false,
  allowControls: true,
  shootEdges: false,
  nodeTransparency: 0.75,
  selectedNodeTransparency: 1.0,
  linkTransparency: 0.5,
  selectedLinkTransparency: 0.8,
  selectedLinkWidth: 4,
  nodeSize: 2
}

const isAR = typeof AFRAME !== 'undefined';
const search = window.location.search ? window.location.search.slice(1, window.location.search.length).split('-') : [];
const settingConfig = {};

function updateSettings() {
  let result = [];
  let form = document.forms[0];
  for (let name in settingConfig) {
    if (typeof settingConfig[name] === 'string') {
      result.push(settingConfig[name] + '_' + form[name].value);
    } else {
      let map = settingConfig[name];
      if (form[name].type !== "checkbox" || form[name].checked) {
        result.push(map[form[name].value]);
      }
    }
  }
  return result.join('-');
}

function setupSearch(mapping, settingName, formElement, formFunction) {
  let value;
  if (typeof settingName === 'function') {
    value = settingName();
  } else {
    value = settings[settingName];
  }

  if (typeof mapping == 'string') {
    settingConfig[formElement] = mapping;
    let result;
    if (result = search.find(s => s.startsWith(mapping+"_"))) {
      let extracted = result.split('_')[1];
      settings[settingName] = parseFloat(extracted);
      value = parseFloat(extracted);
    }
  } else {
    settingConfig[formElement] = Object.fromEntries(Object.entries(mapping).map(([key, value]) => [value+"", key]));

    for (let name in mapping) {
      if (search.indexOf(name) !== -1) {
        if (typeof settingName === 'function') {
          settingName(mapping[name]);
        } else {
          settings[settingName] = mapping[name];
        }
        value = mapping[name];
        break;
      }
    }
  }

  document.getElementsByName(formElement).forEach(e => {
    e.onchange = (e) => {
      let result = formFunction(e);
      let newSettings = updateSettings();
      if (result == 'redirect') {
        window.location.replace("viewer.html?" + newSettings);
      } else {
        window.history.replaceState(null,'',"viewer.html?"+newSettings);
      }
    }
    if (typeof mapping === 'string') {
      e.value = value+"";
    } else {
      if (e.value === value+"") {
        e.checked = true;
      }
    }
  });
}

setupSearch({ fly: 'fly', orbit: 'orbit', trackball: 'trackball'}, 'controlType', 'control_type', (e) =>
{
  if (e.target.value == 'trackball') {
    Graph.cameraPosition({x: 0, y: 0, z: 1000}, {x: 0, y: 0, z: 0},);
  }

  Graph.setNewControls(e.target.value);
});

setupSearch({ labels: 'labels', top50: 'top50', spheres: 'spheres'}, 'displayType', 'display_type', (e) => {
  settings.displayType = e.target.value;
  if (settings.displayType != 'labels') {
    nodeData.forEach(node => { if (node.sprite) { node.sprite.material.map.dispose(); node.sprite.material.dispose(); node.sprite = null; } });
  }
  updateHighlight();
});

setupSearch({ full: 0, most: 10, some: 25, limited: 50, onlytop: 100 }, 'valuesToLimit', 'values_to_limit', (e) => {
  settings.valuesToLimit = parseInt(e.target.value);
  if (!settings.keepOnChange) {
    resetNodes();
  }
  addToSystem(null, { valuesToLimit: settings.valuesToLimit });
});

setupSearch({ '2d': 2, '3d': 3}, 'dimensions', 'dimensions', (e) => {
  settings.dimensions = parseInt(e.target.value);
  if (settings.dimensions == 3) {
    nodeData.forEach(node => node.z = 1);
  }
  Graph.numDimensions(settings.dimensions);
});

setupSearch({'dag': 'td', 'rad': 'radialin', 'dar': 'radialout', 'nodag': false}, 'dag', 'dag', (e) => {
  settings.dag = e.target.value == "false" ? false : e.target.value;
  Graph.dagMode(settings.dag);
});

setupSearch({'clink': true}, 'colorLinks', 'colorlinks', (e) => {
  settings.colorLinks = e.target.checked;
  updateHighlight();
});

setupSearch({'cnode': true}, 'colorNodes', 'colornodes', (e) => {
  settings.colorNodes = e.target.checked;
  updateHighlight();
});

setupSearch({'keepchg': true}, 'keepOnChange', 'keep_on_change', (e) => {
  settings.keepOnChange = e.target.checked;
});

setupSearch({'autozoom': true}, 'autoZoom', 'auto_zoom', (e) => {
  settings.autoZoom = e.target.checked;
});

setupSearch({'pewed': true}, 'shootEdges', 'shoot_edges', (e) => {
  settings.shootEdges = e.target.checked;
});


setupSearch({'ctrl': true}, 'allowControls', 'allow_controls', (e) => {
  settings.allowControls = e.target.checked;
  Graph.enableNavigationControls(settings.allowControls);
});

setupSearch({'nodedrag': true}, 'allowNodeMove', 'allow_node_move', (e) => {
  return 'redirect';
});

setupSearch({'noorph': true}, 'deleteOrphans', 'delete_orphans', (e) => {
  settings.deleteOrphans = e.target.checked;
  if (settings.deleteOrphans) {
    removeOrphans();
  }
});

setupSearch({'topblog': 'topblog', 'spantree': 'spantree'}, 'graphType', 'graph_type', (e) => {
  settings.graphType = e.target.value;
  if (!settings.keepOnChange) {
    resetNodes();
  }
  addToSystem(null, { valuesToLimit: settings.valuesToLimit });
});

setupSearch({elem1: 1, elem2: 2, elem3: 3, elem5: 5, elem10: 10, elem20: 20, elemall: 50}, 'topElems', 'top_elems', (e) => {
  settings.topElems = parseInt(e.target.value);
  if (!settings.keepOnChange) {
    resetNodes();
  }
  addToSystem(null, { valuesToLimit: settings.valuesToLimit });
});

setupSearch('ntr','nodeTransparency','node_transparency', (e) => {
  settings.nodeTransparency = parseFloat(e.target.value);
  updateHighlight();
});

setupSearch('sntr','selectedNodeTransparency','selected_node_transparency', (e) => {
  settings.selectedNodeTransparency = parseFloat(e.target.value);
  updateHighlight();
});

setupSearch('ltr','linkTransparency','link_transparency', (e) => {
  settings.linkTransparency = parseFloat(e.target.value);
  updateHighlight();
});

setupSearch('sltr','selectedLinkTransparency','selected_link_transparency', (e) => {
  settings.selectedLinkTransparency = parseFloat(e.target.value);
  updateHighlight();
});

setupSearch('nsz','nodeSize','node_size', (e) => {
  settings.nodeSize = parseFloat(e.target.value);
  updateHighlight();
});

setupSearch('slsz','selectedLinkWidth','selected_link_size', (e) => {
  settings.selectedLinkWidth = parseFloat(e.target.value);
  updateHighlight();
});

settings.valuesToLoad = [];

for (let year = 10; year <= 22; year++) {
  let key = `y${year}`;
  let value = year == 22 ? "current" : `20${year}`;

  let map = {};
  map[key] = value;

  setupSearch(map, (e) => {
    if (!e) {
      return false;
    } else {
      settings.valuesToLoad.push(e);
    }
  }, key, (e) => {
    if (e.target.checked) {
      if (settings.valuesToLoad.indexOf(e.target.value) === -1) {
        settings.valuesToLoad.push(e.target.value);
      }
    } else {
      if (settings.valuesToLoad.indexOf(e.target.value) !== -1) {
        settings.valuesToLoad.splice( settings.valuesToLoad.indexOf(e.target.value), 1);
      }
    }
    if (!settings.keepOnChange) {
      resetNodes();
    }
    spanningEdges = [];
    availableBlogIds.clear();
    addToSystem(null, { valuesToLimit: settings.valuesToLimit });
    fillBlogSearchList();
  });
}

if (settings.valuesToLoad.length == 0) {
  settings.valuesToLoad = ["2019","2020","2021","current"];
  for (let year=19; year<=22; year++) {
    let element = document.getElementsByName(`y${year}`);
    if (element && element[0]) {
      element[0].checked = true;
    }
  }
}

const nodeBlackList = new Set();
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

console.log(settings);

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
    distance: (1/data[1]) * 300,
    strength: data[1],
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
    if (nodeBlackList.has(source))
      continue;

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
        if (nodeBlackList.has(destination))
          continue;

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
      original.backValue = value
      original.backData = data;
      original.distance = (1 / Math.max(original.data[1], data[1])) * 300;
      changed = true;
      //if (!settings.dag) getSystemLink(source, destination, data);
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
    if (nodeBlackList.has(source))
      continue;

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
        if (nodeBlackList.has(destination))
          continue;

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
  if (nodeBlackList.has(focusBlogId))
    return false;

  let changed = false;
  if (focusBlogId) {
    let focusBlog;
    [changed, focusBlog] = getSystemNode(focusBlogId);
    console.log(changed);
  }

  options.valuesToLimit ||= 0;
  options.topElems ||= settings.topElems;

  if (settings.graphType == 'spantree') {
    changed |= addToSystemSpan(focusBlogId, options);
  } else {
    changed |= addToSystemTopBlog(focusBlogId, options);
  }

  if (changed && !options.skipUpdate) {
    runClustering();
    updateHighlight();
    Graph.graphData(initData);
    if (settings.dag) {
      Graph.dagMode(settings.dag);
    }
  }

  return changed;
}

function setCluster(node, cluster, depth = 0) {
  if (node.cluster !== null) return;
  if (depth > 1000) return;

  node.cluster = cluster;
  node.neighborsFrom.forEach(n => setCluster(n, cluster, depth + 1));
  node.neighborsTo.forEach(n => setCluster(n, cluster, depth + 1));
}

let numClusters = 0;
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
  numClusters = currentCluster;
}

// initial graph loading, only loading nodes and edges above a certain threshold
addToSystem(null, { valuesToLimit: settings.valuesToLimit, skipUpdate: true });
runClustering();

const availableBlogs = Array.from(availableBlogIds).map(id => ({ id: id, name: tumblrData.nodes[id] })).sort((a,b) => a.name < b.name ? -1 : 1);

const elem = document.getElementById('3d-graph');

// set up the Graph object
const Graph =
  isAR ? ForceGraphAR()(elem)
  : ForceGraph3D({ controlType: settings.controlType })(elem);

window.onload = function() {
  Graph
    .linkColor(getLinkColor)
    .nodeColor(node => colorizeNode(node))
    .nodeVal(node => node.totalVal)
    .nodeRelSize(settings.nodeSize)
    .linkWidth(link => highlightLinks.has(link) ? settings.selectedLinkWidth : 0)
    .linkDirectionalParticles(link => highlightLinks.has(link) ? 4 : 0)
    .linkDirectionalParticleWidth(0.5)
    .linkOpacity(1)
    .nodeResolution(1)
    .numDimensions(settings.dimensions)
    .nodeThreeObject(getNodeObject)
    .onNodeClick(onNodeClick)
    .onLinkClick(link => onNodeClick(link.source))
    .graphData(initData)
    .onDagError(function(n) { console.log('Error in DAG: ', n)});

    if (settings.dag) {
      Graph.dagMode(settings.dag)
    }

  if (!isAR) {
    Graph.enableNodeDrag(settings.allowNodeMove)
      .onNodeDragEnd(node => {
        node.fx = node.x;
        node.fy = node.y;
        node.fz = node.z;
      })
      .linkLabel(link => `${link.source.name} -> ${link.target.name} (${link.data[0]}, ${link.data[1]})` + (link.backData ? `<br>${link.target.name} -> ${link.source.name}  (${link.backData[0]}, ${link.backData[1]})` : ''))
      .nodeLabel(getNodeLabel)
      .enableNavigationControls(settings.allowControls)
  }
};

// const ForceLink = Graph
//   .d3Force('link')
//   .distance(link => link.distance)
//  // .strength(link => 1 - link.strength / maxMaxValue * 0.8);

// const ForceCharge = Graph
//   .d3Force('charge')
//   .strength(-50);

// const ForceCenter = Graph.d3Force('center').strength(0.01);

// handle the controls on the right
if (!isAR) {
  const controls = document.getElementById("controls");

  document.getElementById("zoom-out").onclick = function(e) {
    autoFocus = 'all';
    e.preventDefault();
  }

  document.getElementById("fire-bullet").onclick = function(e) {
    shootLaser();
    e.preventDefault();
  }

  document.getElementById("gay-mode").onclick = function(e) {
    gayMode(true);
    e.preventDefault();
  }

  let discoMode = null;
  document.getElementById("disco-mode").onclick = function(e) {
    if (!discoMode) {
      const discoMode = new THREE.UnrealBloomPass();
      discoMode.strength = 0.5;
      discoMode.radius = 2;
      discoMode.threshold = 0.1;
      Graph.postProcessingComposer().addPass(discoMode);
    } else {
      discoMode.strength = discoMode.strength + 0.25;
    }
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

  function fillBlogSearchList() {
    const searchValues = document.getElementById("search-values");
    searchValues.innerHTML='';
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
  }

  fillBlogSearchList();
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
    if (!isAR) {
      Graph.zoomToFit(400);
    }
    setTimeout(runZoom, 1000);
  } else if (Number.isInteger(autoFocus)) {
    const node = nodeData.find(n => n.id == autoFocus);
    if (node) {
      zoomTo(node, 1000);
    }

    setTimeout(runZoom, 1100);
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
  if (!isAR && /Mozilla.+Android.+Mobile.+Firefox\//.test(navigator.userAgent)) {
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
    if (!isAR) {
      setTimeout(function() { document.getElementById("loading").style.opacity = "0";},1);
      setTimeout(function() { document.getElementById("loading").style.display = "none";},1100);
    }
  }
  labelDone = 0;
  labelSkipped = 0;
  setTimeout(updateLabels, 1000);
}, 1000);

// handle resize events to make sure the screen keeps it's normal size
window.addEventListener('resize', function() {
  if (!isAR) {
    Graph.width(document.body.clientWidth);
    Graph.height(document.body.clientHeight);
  }
});

let searchResults = [];
function findShortestPath(startNode, endNode) {
  searchResults = [];
  for (let n of nodeData) {
    n.searchParentNode = null;
    n.searchParentEdge = null;
    n.searchCost = null;
  }

  let node = startNode;

  let frontierNodes = [];
  frontierNodes.push(startNode);
  startNode.searchCost = 0;

  let expanded = new Set();

  while (true) {
    if (frontierNodes.length == 0) return;
    frontierNodes.sort((a,b) => b.searchCost - a.searchCost);

    node = frontierNodes.pop();

    if (node == endNode) {
      while (node != null) {
        if (node.searchParentEdge)
          highlightLinks.add(node.searchParentEdge);
        searchResults.push(node);
        node = node.searchParentNode;
      }
      return;
    }

    expanded.add(node);

    for (let edge of node.links) {
      let otherNode = edge.source;
      if (otherNode == node) otherNode = edge.target;

      if (!expanded.has(otherNode)) {
        if (otherNode.searchCost) {
          if (node.searchCost + edge.distance < otherNode.searchCost) {
            otherNode.searchParentNode = node;
            otherNode.searchParentEdge = edge;
            otherNode.searchCost = node.searchCost + edge.distance;
          }
        } else {
          otherNode.searchParentNode = node;
          otherNode.searchParentEdge = edge;
          otherNode.searchCost = node.searchCost + edge.distance;
          frontierNodes.push(otherNode);
        }
      }
    }
  }
}

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

    if (startPoint && nodes[startPoint.id]) {
      findShortestPath(startPoint, node);
      startPoint = null;
    } else {
      hightlightNodes.add(node);
      node.neighborsTo.forEach(node => hightlightNodes.add(node));
      node.neighborsFrom.forEach(node => hightlightNodes.add(node));
      node.links.forEach(link => highlightLinks.add(link));
      Array.from(node.links).filter(link => link.source == node).forEach(link => link.target.neighborsTo.has(node) ? highlightLinksBoth.add(link) : highlightLinksTo.add(link));
      Array.from(node.links).filter(link => link.target == node).forEach(link => link.source.neighborsFrom.has(node) ? highlightLinksBoth.add(link) : null);
      fillNodeDetails(node);
      hoverNode = node;
    }
  } else {
    fillNodeDetails(null);
    hoverNode = null;
    startPoint = null;
  }

  updateHighlight();

  if (settings.autoZoom) {
    if (node) {
      autoFocus = node.id;
    } else {
      autoFocus = 'all';
    }
  }
}

// generate label for a node for a specific color
function getSprite(node) {
  let sprite = new SpriteText(node.name);
  sprite.backgroundColor = "white";
  sprite.color = "black";
  sprite.textHeight = (1 + Math.sqrt(node.val) / Math.sqrt(maxMaxValue) * 50);
  sprite.padding = 0.5;
  sprite.borderWidth = 0.2;
  sprite.borderColor = "black";
  sprite.genCanvas();

  return sprite;
}

// obtain how to display the specific node. Has some extra settings to allow lazy loading of labels for larger graphs
function getNodeObject(node) {
  let result = false;

  if (!isAR || getGlobalCamera()) {
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

      if (node.sprite.currentSize != settings.nodeSize) {
        if (!node.sprite.originalDimensions) {
          node.sprite.originalDimensions = node.sprite.scale.clone();
        }
        node.sprite.scale.set(settings.nodeSize * node.sprite.originalDimensions.x, settings.nodeSize * node.sprite.originalDimensions.y, 0);
        node.sprite.curentSize = settings.nodeSize;
      }
    }
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
    obj.material.opacity = hightlightNodes.has(node) ? settings.selectedNodeTransparency : settings.nodeTransparency;
  }

  return TinyColor({h: hsl.h*360, s: hsl.s, l: hsl.l, a: hightlightNodes.has(node) ? settings.selectedNodeTransparency : settings.nodeTransparency});
}

// obtain the color of the link
function getLinkColor(link)
{
  if (link.linkDirection == 'both') {
    if (highlightLinks.has(link)) {
      return 'rgba(255,0,0,'+settings.selectedLinkTransparency+')';
    } else {
      return 'rgba(255,0,0,'+settings.linkTransparency+')';
    }
  }
  if (highlightLinks.has(link)) {
    if (highlightLinksTo.has(link)) {
      return 'rgba(255,255,0,'+settings.selectedLinkTransparency+')';
    }
    return 'rgba(0,255,0,'+settings.selectedLinkTransparency+')';
  }
  if (settings.colorLinks && link.source.cluster) {
    return TinyColor({h: (link.source.cluster % 20)/20*360, s: 0.75, l: 0.5, a: settings.linkTransparency});
  }
  return 'rgba(255,255,255,'+settings.linkTransparency+')';
}

// trigger update of highlighted objects in scene
function updateHighlight() {
  Graph
    .nodeRelSize(settings.nodeSize)
    .linkColor(Graph.linkColor())
    .linkWidth(Graph.linkWidth())
    .nodeThreeObject(Graph.nodeThreeObject())
    .linkDirectionalParticles(Graph.linkDirectionalParticles());

  fillStats();
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

let startPoint = null;

if (!isAR) {
  document.getElementById("node-info-exit").onclick = (e) => { fillNodeDetails(null); onNodeClick(null); e.preventDefault(); }
}
// node modification tools
function fillNodeDetails(node) {
  if (isAR) return;

  let details = '';
  if (node) {
    details += `Név: ${node.name} <br>`;
    details += `Izom: ${node.val} (${node.totalVal})<br>`;
    details += `Csoport: ${node.cluster}<br>`;
    details += `Szomszédok: ${node.neighborsFrom.size} / ${node.neighborsTo.size}`;

    document.getElementById('node-info-zoom').onclick = (e) => { autoFocus = node.id; e.preventDefault() };
    document.getElementById('node-info-add').onclick = (e) => { openNode(node); e.preventDefault(); };
    document.getElementById('node-info-add-all').onclick = (e) => { openNode(node, true, false); e.preventDefault(); };
    document.getElementById('node-info-path').onclick = (e) => { startPoint = node; e.preventDefault(); };
    document.getElementById('node-info-delete').onclick = (e) => { deleteNode(node); setTimeout(removeOrphans,500); e.preventDefault(); };
    document.getElementById('node-info-ban').onclick = (e) => { deleteNode(node, true); setTimeout(removeOrphans,500); e.preventDefault(); };

    document.getElementById('node-info').style.display = "block";
  } else {
    let prevDefault = (e) => { e.preventDefault() };
    document.getElementById('node-info-zoom').onclick = prevDefault;
    document.getElementById('node-info-add').onclick = prevDefault;
    document.getElementById('node-info-add-all').onclick = prevDefault;
    document.getElementById('node-info-path').onclick = prevDefault;
    document.getElementById('node-info-delete').onclick = prevDefault;
    document.getElementById('node-info-ban').onclick = prevDefault;
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

  updateHighlight();

  if (includeNeighbors) {
    runClustering();
    Graph.graphData(initData);
  }
}

function deleteNode(node, blacklist = false, skipUpdate = false) {
  if (!node) return;
  if (blacklist) {
    nodeBlackList.add(node.id);
    availableBlogIds.delete(node.id);
    spanningEdges = [];
  }

  let element;
  element = document.getElementById(`top-blog-${node.id}`);
  if (element) element.classList.remove('top-blog');
  if (element && blacklist) element.remove();

  element = document.getElementById(`blog-${node.id}`);
  if (element) element.classList.remove('top-blog');
  if (element && blacklist) element.remove();

  node.links.forEach(link => {
    link.source.links.delete(link);
    link.target.links.delete(link);

    link.source.neighborsTo.delete(link.target);
    link.target.neighborsFrom.delete(link.source);

    delete links[link.source.id][link.target.id];
    linkData.splice(linkData.indexOf(link), 1);
  });

  if (node.sprite) {
    setTimeout(() => {
      node.sprite.material.map.dispose();
      node.sprite.material.dispose();
      node.sprite = null;
    },1);
  }

  delete nodes[node.id];
  nodeData.splice(nodeData.indexOf(node),1);

  if (!skipUpdate) {
    Graph.graphData(initData);
    if (settings.dag) {
      Graph.dagMode(settings.dag);
    }

    runClustering();
    updateHighlight();
    fillNodeDetails(null);
  }
}

if (!isAR) {
  document.getElementById('b-remove-orphans').onclick = (e) => { removeOrphans(true); e.preventDefault(); };
  document.getElementById('b-remove-leaf-nodes').onclick = (e) => { removeOrphans(true, 1); e.preventDefault(); };
  document.getElementById('b-remove-one-link').onclick = (e) => { removeOrphans(true, 1, false); e.preventDefault(); };
  document.getElementById('b-empty-blacklist').onclick = (e) => { nodeBlackList.clear(); fillBlogSearchList(); e.preventDefault(); };
}


function removeOrphans(force = false, linkLimit = 0, checkDualLinks = true) {
  if (settings.deleteOrphans || force) {
    let removal = new Set();
    let changed = false;
    for (let i = nodeData.length - 1; i >= 0; i--) {
      if (nodeData[i].links.size == 0) {
        removal.add(i);
        changed = true;
      } else if (nodeData[i].links.size + (checkDualLinks ? Array.from(nodeData[i].links).filter(link => link.linkDirection == 'both').length : 0) <= linkLimit) {
        removal.add(i);
        changed = true;
      }
    }
    if (changed) {
      for (let i = nodeData.length - 1; i >= 0; i--) {
        if (removal.has(i)) {
          deleteNode(nodeData[i], false, true);
        }
      }
      Graph.graphData(initData);
      if (settings.dag) {
        Graph.dagMode(settings.dag);
      }

      runClustering();
      updateHighlight();
      fillNodeDetails(null);
      fillBlogSearchList();
    }
  }
}

function resetNodes() {
  nodeData.forEach(node => {
    node.val = 0;
    node.totalVal = 0;
    node.links = new Set();
    node.neighborsFrom = new Set();
    node.neighborsTo = new Set();
    node.cluster = null;
    node.openedDepth = null;
  });

  linkData.splice(0, linkData.length);
  for (const prop of Object.getOwnPropertyNames(links)) {
    delete links[prop];
  }

  setTimeout(removeOrphans,500);
}

function fillStats() {
  if (isAR) return;
  text = '<h3>Főbb adatok</h3>';
  text += `<p>Blogok: ${nodeData.length}</p>`;
  text += `<p>Kapcsolatok: ${linkData.length}</p>`;
  text += `<p>Közös kapcsolatok: ${Array.from(linkData).filter(link => link.linkDirection == 'both').length}</p>`;
  text += `<p>Csoportok: ${numClusters}</p>`;

  if (hoverNode) {
    text += '<h3>Kijelölés</h3>';
    text += `<p>Kijelölt blog azonosítója: ${hoverNode.id}</p>`;
    text += `<p>Kapcsolatok: ${hoverNode.links.size}</p>`;
    text += `<p>Közös kapcsolatok: ${Array.from(hoverNode.links).filter(link => link.linkDirection == 'both').length}</p>`;
    text += `<p>Bejövő élek: ${hoverNode.neighborsFrom.size}</p>`;
    text += `<p>Kimenő élek: ${hoverNode.neighborsTo.size}</p>`;
    text += `<p>Csoport: ${hoverNode.cluster}</p>`;
    text += `<h4>Kapcsolatok</h4>`;
    text += `<h5>Közös kapcsolatok</h5>`;
    text += `<ol>`;
    for (const link of Array.from(hoverNode.links).filter(link => link.linkDirection == 'both').sort((a,b) => Math.max(b.backData[1],b.data[1]) - Math.max(a.backData[1],a.data[1]))) {
      text += `<li>${link.source.name} -> ${link.target.name}: ${link.data[0]} / ${link.data[1]}<br>`;
      text += `${link.target.name} -> ${link.source.name}: ${link.backData[0]} / ${link.backData[1]}</li>`;
    }
    text += `</ol>`;

    text += `<h5>Bejövő kapcsolatok</h5>`;
    text += `<ol>`;
    for (const link of Array.from(hoverNode.links).filter(link => link.linkDirection != 'both' && link.target == hoverNode).sort((a,b) => b.data[1] - a.data[1])) {
      text += `<li>${link.source.name} -> ${link.target.name}: ${link.data[0]} / ${link.data[1]}</li>`;
    }
    text += `</ol>`;

    text += `<h5>Kimenő kapcsolatok</h5>`;
    text += `<ol>`;
    for (const link of Array.from(hoverNode.links).filter(link => link.linkDirection != 'both' && link.source == hoverNode).sort((a,b) => b.data[1] - a.data[1])) {
      text += `<li>${link.source.name} -> ${link.target.name}: ${link.data[0]} / ${link.data[1]}</li>`;
    }
    text += `</ol>`;

    if (searchResults.length != 0) {
      text += `<h5>Legrövidebb út</h5>`;
      text += `<ol>`;
      for (const node of searchResults) {
        text += `<li>${node.name} (${node.searchCost})</li>`;
      }
      text += `</ol>`;

    }
  }

  document.getElementById('stats-content').innerHTML = text;
}

fillStats();

let projectiles = [];
let nextLeft = false;
const geometry = new THREE.SphereGeometry( 15, 32, 16 );
const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
let audioListener = null;
let laserBuffer = null;
let explosionBuffer = null;

audioListener = new THREE.AudioListener();

let globalCamera = null;

if (!isAR) {
  globalCamera = Graph.camera();
  globalCamera.add( audioListener );
}

function getGlobalCamera() {
  if (globalCamera) {
    return globalCamera;
  }
  if (!globalCamera && isAR) {
    const cameraEl = document.querySelector('a-entity[camera], a-camera');
    globalCamera = cameraEl.object3D.children.filter(function (child) { return child.type === 'PerspectiveCamera'; })[0];
    if (globalCamera) {
      globalCamera.add( audioListener );
    }
  }
  return globalCamera;
}

const audioLoader = new THREE.AudioLoader();
audioLoader.load( 'img/466867__mikee63__blaster-shot-single-5.wav', function( buffer ) {
  laserBuffer = buffer;
});
audioLoader.load( 'img/587196__derplayer__explosion-06.wav', function( buffer ) {
  explosionBuffer = buffer;
});


function shootLaser() {
  if (!getGlobalCamera()) return;

  let scene = null;
  if (isAR) {
    scene = document.getElementsByTagName('a-scene')[0].object3D;
  } else {
    scene = Graph.scene();
  }

  if (!scene) return;

  const proj = {
    sphere: new THREE.Mesh( geometry, material ),
    count: 0,
    tick: function() {
      proj.count += 1;

      let nodesToDelete = [];
      let edgesToDelete = [];

      if (settings.shootEdges) {
        let line = new THREE.Line3();
        let resultPoint = new THREE.Vector3();

        for (let link of linkData) {
          if (link.source.__threeObj && link.target.__threeObj) {
            line.set(link.source.__threeObj.position, link.target.__threeObj.position).closestPointToPoint(proj.sphere.position, true, resultPoint);

            if (proj.sphere.position.distanceToSquared(resultPoint) < 65*65) {
              edgesToDelete.push(link);
            }
          }
        }
      }

      for (let node of nodeData) {
        if (node.__threeObj) {
          if (node.__threeObj.position.distanceToSquared(proj.sphere.position) < 65*65) {
            nodesToDelete.push(node);
          }
        }
      }

      if (nodesToDelete.length == 0 && edgesToDelete == 0) {
        if (proj.count < 150) {
          proj.sphere.translateZ(100);
          requestAnimationFrame(proj.tick);
        } else {
          scene.remove(proj.sphere);
          projectiles.splice(projectiles.indexOf(proj), 1);
        }
      } else {
        scene.remove(proj.sphere);
        projectiles.splice(projectiles.indexOf(proj), 1);

        if (explosionBuffer) {
          const sound = new THREE.PositionalAudio( audioListener );
          sound.setBuffer( explosionBuffer );
          sound.setRefDistance( 20 );
          sound.play();

          proj.sphere.add( sound );
        }

        for (let node of nodesToDelete) {
          deleteNode(node, false, true);
        }

        for (let link of edgesToDelete) {
          link.source.links.delete(link);
          link.target.links.delete(link);
          link.source.neighborsFrom.delete(link.target);
          link.source.neighborsTo.delete(link.target);
          link.target.neighborsFrom.delete(link.source);
          link.target.neighborsTo.delete(link.source);

          linkData.splice(linkData.indexOf(link), 1);
          delete links[link.source.id][link.target.id];
        }
        Graph.graphData(initData);
        runClustering();
        setTimeout(removeOrphans,500);
      }
    }
  }

  nextLeft = !nextLeft;

  const startPos = new THREE.Vector3(nextLeft ? 50: -50, 0, 100);
  startPos.applyMatrix4(globalCamera.matrixWorld);

  const endPos = new THREE.Vector3(0, 0, -10000);
  endPos.applyMatrix4(globalCamera.matrixWorld);

  scene.add( proj.sphere );

  proj.sphere.position.lerp(startPos,1);
  proj.sphere.lookAt(endPos);
  proj.tick();

  if (laserBuffer) {
    const sound = new THREE.PositionalAudio( audioListener );
    sound.setBuffer( laserBuffer );
    sound.setRefDistance( 20 );
    sound.play();

    proj.sphere.add( sound );
  }

  projectiles.push(proj);
}

window.addEventListener('keydown', (e) => {
  if (e.key == ' ') {
    shootLaser();
  }
});
