  if (typeof AFRAME === 'undefined') {
    throw new Error('Component attempted to register before AFRAME was available.');
  }

  const parseJson = function (prop) {
  return (typeof prop === 'string')
      ? JSON.parse(prop)
      : prop; // already parsed
  };

  const parseFn = function (prop) {
  if (typeof prop === 'function') return prop; // already a function
  const geval = eval; // Avoid using eval directly https://github.com/rollup/rollup/wiki/Troubleshooting#avoiding-eval
  try {
      const evalled = geval('(' + prop + ')');
      return evalled;
  } catch (e) {} // Can't eval, not a function
  return null;
  };

  const parseAccessor = function (prop) {
  if (!isNaN(parseFloat(prop))) { return parseFloat(prop); } // parse numbers
  if (parseFn(prop)) { return parseFn(prop); } // parse functions
  return prop; // strings
  };

  /**
   * 3D Force-Directed Graph component for A-Frame.
   */
  AFRAME.registerComponent('forcegraph', {
  schema: {
      jsonUrl: { type: 'string', default: '' },
      nodes: { parse: parseJson, default: [] },
      links: { parse: parseJson, default: [] },
      numDimensions: { type: 'number', default: 3 },
      dagMode: { type: 'string', default: '' },
      dagLevelDistance: { type: 'number', default: 0 },
      dagNodeFilter: { parse: parseFn, default: function() { return true; }},
      onDagError: { parse: parseFn, default: undefined },
      nodeRelSize: { type: 'number', default: 4 }, // volume per val unit
      nodeId: { type: 'string', default: 'id' },
      nodeVal: { parse: parseAccessor, default: 'val' },
      nodeResolution: { type: 'number', default: 8 }, // how many slice segments in the sphere's circumference
      nodeVisibility: { parse: parseAccessor, default: true },
      nodeColor: { parse: parseAccessor, default: 'color' },
      nodeAutoColorBy: { parse: parseAccessor, default: '' }, // color nodes with the same field equally
      nodeOpacity: { type: 'number', default: 0.75 },
      nodeThreeObject: { parse: parseAccessor, default: null },
      nodeThreeObjectExtend: { parse: parseAccessor, default: false },
      linkSource: { type: 'string', default: 'source' },
      linkTarget: { type: 'string', default: 'target' },
      linkVisibility: { parse: parseAccessor, default: true },
      linkColor: { parse: parseAccessor, default: 'color' },
      linkAutoColorBy: { parse: parseAccessor, default: '' }, // color links with the same field equally
      linkOpacity: { type: 'number', default: 0.2 },
      linkWidth: { parse: parseAccessor, default: 0 },
      linkResolution: { type: 'number', default: 6 }, // how many radial segments in each line cylinder's geometry
      linkCurvature: { parse: parseAccessor, default: 0 },
      linkCurveRotation: { parse: parseAccessor, default: 0 },
      linkMaterial: { parse: parseAccessor, default: null },
      linkThreeObject: { parse: parseAccessor, default: null },
      linkThreeObjectExtend: { parse: parseAccessor, default: false },
      linkPositionUpdate: { parse: parseFn, default: null },
      linkDirectionalArrowLength: { parse: parseAccessor, default: 0 },
      linkDirectionalArrowColor: { parse: parseAccessor, default: null },
      linkDirectionalArrowRelPos: { parse: parseAccessor, default: 0.5 }, // value between 0<>1 indicating the relative pos along the (exposed) line
      linkDirectionalArrowResolution: { type: 'number', default: 8 }, // how many slice segments in the arrow's conic circumference
      linkDirectionalParticles: { parse: parseAccessor, default: 0 }, // animate photons travelling in the link direction
      linkDirectionalParticleSpeed: { parse: parseAccessor, default: 0.01 }, // in link length ratio per frame
      linkDirectionalParticleWidth: { parse: parseAccessor, default: 0.5 },
      linkDirectionalParticleColor: { parse: parseAccessor, default: null },
      linkDirectionalParticleResolution: { type: 'number', default: 4 }, // how many slice segments in the particle sphere's circumference
      onNodeHover: { parse: parseFn, default: () => {} },
      onLinkHover: { parse: parseFn, default: () => {} },
      onNodeClick: { parse: parseFn, default: () => {} },
      onLinkClick: { parse: parseFn, default: () => {} },
      forceEngine: { type: 'string', default: 'd3' }, // 'd3' or 'ngraph'
      d3AlphaMin: { type: 'number', default: 0 },
      d3AlphaDecay: { type: 'number', default: 0.0228 },
      d3VelocityDecay: { type: 'number', default: 0.4 },
      ngraphPhysics: { parse: parseJson, default: null },
      warmupTicks: { type: 'int', default: 0 }, // how many times to tick the force engine at init before starting to render
      cooldownTicks: { type: 'int', default: 1e18 }, // Simulate infinity (int parser doesn't accept Infinity object)
      cooldownTime: { type: 'int', default: 15000 }, // ms
      onEngineTick: { parse: parseFn, default: function () {} },
      onEngineStop: { parse: parseFn, default: function () {} }
  },

  // Bind component methods
  getGraphBbox: function() {
      if (!this.forceGraph) {
      // Got here before component init -> initialize forceGraph
      this.forceGraph = new ThreeForceGraph();
      }

      return this.forceGraph.getGraphBbox();
  },
  emitParticle: function () {
      if (!this.forceGraph) {
      // Got here before component init -> initialize forceGraph
      this.forceGraph = new ThreeForceGraph();
      }

      const forceGraph = this.forceGraph;
      const returnVal = forceGraph.emitParticle.apply(forceGraph, arguments);

      return returnVal === forceGraph
      ? this // return self, not the inner forcegraph component
      : returnVal;
  },

  d3Force: function () {
      if (!this.forceGraph) {
      // Got here before component init -> initialize forceGraph
      this.forceGraph = new ThreeForceGraph();
      }

      const forceGraph = this.forceGraph;
      const returnVal = forceGraph.d3Force.apply(forceGraph, arguments);

      return returnVal === forceGraph
      ? this // return self, not the inner forcegraph component
      : returnVal;
  },

  d3ReheatSimulation: function () {
      this.forceGraph && this.forceGraph.d3ReheatSimulation();
      return this;
  },

  refresh: function () {
      this.forceGraph && this.forceGraph.refresh();
      return this;
  },

  init: function () {
      const state = this.state = {}; // Internal state

      // Add info msg
      state.infoEl = document.createElement('a-text');
      state.infoEl.setAttribute('position', '0 -0.1 -1'); // Canvas center
      state.infoEl.setAttribute('width', 1);
      state.infoEl.setAttribute('align', 'center');
      state.infoEl.setAttribute('color', 'lavender');

      // Get camera dom element and attach fixed view elements to camera
      const cameraEl = document.querySelector('a-entity[camera], a-camera');
      cameraEl.appendChild(state.infoEl);

      // Keep reference to Three camera object
      state.cameraObj = cameraEl.object3D.children
      .filter(function (child) { return child.type === 'PerspectiveCamera'; })[0];

      // On camera switch
      this.el.sceneEl.addEventListener('camera-set-active', function (evt) {
      // Switch camera reference
      state.cameraObj = evt.detail.cameraEl.components.camera.camera;
      });

      // setup FG object
      if (!this.forceGraph) this.forceGraph = new ThreeForceGraph(); // initialize forceGraph if it doesn't exist yet
      this.forceGraph
      .onFinishUpdate(() => this.el.setObject3D('forcegraphGroup', this.forceGraph)) // Bind forcegraph to elem
      .onLoading(() => state.infoEl.setAttribute('value', 'Loading...')) // Add loading msg
      .onFinishLoading(() => state.infoEl.setAttribute('value', ''));

      // prefer raycaster events over mouseenter/mouseleave because they expose immediately available intersection data via detail.getIntersection()
      this.el.addEventListener('raycaster-intersected', ev => state.hoverDetail = ev.detail);
      this.el.addEventListener('raycaster-intersected-cleared', ev => state.hoverDetail = ev.detail);

      this.el.addEventListener('click', () =>
      state.hoverObj && this.data['on' + (state.hoverObj.__graphObjType === 'node' ? 'Node' : 'Link') + 'Click'](state.hoverObj.__data)
      );
  },

  remove: function () {
      // Clean-up elems
      this.state.infoEl.remove();
      this.el.removeObject3D('forcegraphGroup');
  },

  update: function (oldData) {
      const comp = this;
      const elData = this.data;
      const diff = AFRAME.utils.diff(elData, oldData);

      const fgProps = [
      'jsonUrl',
      'numDimensions',
      'dagMode',
      'dagLevelDistance',
      'dagNodeFilter',
      'onDagError',
      'nodeRelSize',
      'nodeId',
      'nodeVal',
      'nodeResolution',
      'nodeVisibility',
      'nodeColor',
      'nodeAutoColorBy',
      'nodeOpacity',
      'nodeThreeObject',
      'nodeThreeObjectExtend',
      'linkSource',
      'linkTarget',
      'linkVisibility',
      'linkColor',
      'linkAutoColorBy',
      'linkOpacity',
      'linkWidth',
      'linkResolution',
      'linkCurvature',
      'linkCurveRotation',
      'linkMaterial',
      'linkThreeObject',
      'linkThreeObjectExtend',
      'linkPositionUpdate',
      'linkDirectionalArrowLength',
      'linkDirectionalArrowColor',
      'linkDirectionalArrowRelPos',
      'linkDirectionalArrowResolution',
      'linkDirectionalParticles',
      'linkDirectionalParticleSpeed',
      'linkDirectionalParticleWidth',
      'linkDirectionalParticleColor',
      'linkDirectionalParticleResolution',
      'forceEngine',
      'd3AlphaMin',
      'd3AphaDecay',
      'd3VelocityDecay',
      'ngraphPhysics',
      'warmupTicks',
      'cooldownTicks',
      'cooldownTime',
      'onEngineTick',
      'onEngineStop'
      ];

      fgProps
      .filter(function (p) { return p in diff; })
      .forEach(function (p) { comp.forceGraph[p](elData[p] !== '' ? elData[p] : null); }); // Convert blank values into nulls

      if ('nodes' in diff || 'links' in diff) {
      comp.forceGraph.graphData({
          nodes: elData.nodes,
          links: elData.links
      });
      }
  },

  tick: function (t, td) {
      const state = this.state;
      const props = this.data;

      // Update hover (intersected) object
      const intersection = state.hoverDetail
      ? state.hoverDetail.getIntersection
          ? state.hoverDetail.getIntersection(this.el) // available in raycaster-intersected events
          : state.hoverDetail.intersection || undefined // available in mouseenter/mouseleave events (with delayed update)
      : undefined;

      // Note:
      // Unfortunately we only have access to the intersected object closer to the camera (1st element in the raycaster intersectObjects result),
      // there is no ".getIntersections()" method available in the event details. Therefore, we can't prioritize hover on nodes over links, or even exclude
      // objects that are neither nodes or links. This makes the interaction a bit erratic if nodes have a lot of links in front.
      // Configuring the raycaster.params.Line.threshold might help with this somewhat, but that config is also not available via the a-frame raycaster component.

      // recurse up until forcegraph obj is found
      let topObject = intersection ? intersection.object : undefined;
      while (topObject && !topObject.hasOwnProperty('__graphObjType'))
      topObject = topObject.parent;

      if (topObject !== state.hoverObj) {
      const prevObjType = state.hoverObj ? state.hoverObj.__graphObjType : null;
      const prevObjData = state.hoverObj ? state.hoverObj.__data : null;
      const objType = topObject ? topObject.__graphObjType : null;
      const objData = topObject ? topObject.__data : null;

      if (prevObjType && prevObjType !== objType) {
          // Hover out
          props['on' + (prevObjType === 'node' ? 'Node' : 'Link') + 'Hover'](null, prevObjData);
      }
      if (objType) {
          // Hover in
          props['on' + (objType === 'node' ? 'Node' : 'Link') + 'Hover'](objData, prevObjType === objType ? prevObjData : null);
      }

      state.hoverObj = topObject;
      }

      // Run force-graph ticker
      this.forceGraph.tickFrame();
  }
  });

  window.ForceGraphAR = kapsuleFunction({
    props: {
      width: {},
      height: {},
      yOffset: { default: 1.5 }, // marker size units
      glScale: { default: 200 }, // gl units per marker width
      jsonUrl: {},
      graphData: { default: { nodes: [], links: [] }},
      numDimensions: { default: 3 },
      dagMode: {},
      dagLevelDistance: {},
      dagNodeFilter: { default: () => true },
      onDagError: { default: undefined },
      nodeRelSize: { default: 4 }, // volume per val unit
      nodeId: { default: 'id' },
      nodeVal: { default: 'val' },
      nodeResolution: { default: 8 }, // how many slice segments in the sphere's circumference
      nodeVisibility: { default: true },
      nodeColor: { default: 'color' },
      nodeAutoColorBy: {},
      nodeOpacity: { default: 0.75 },
      nodeThreeObject: {},
      nodeThreeObjectExtend: { default: false },
      linkSource: { default: 'source' },
      linkTarget: { default: 'target' },
      linkVisibility: { default: true },
      linkColor: { default: 'color' },
      linkAutoColorBy: {},
      linkOpacity: { default: 0.2 },
      linkWidth: { default: 0 },
      linkResolution: { default: 6 }, // how many radial segments in each line cylinder's geometry
      linkCurvature: { default: 0 },
      linkCurveRotation: { default: 0 },
      linkMaterial: {},
      linkThreeObject: {},
      linkThreeObjectExtend: { default: false },
      linkPositionUpdate: {},
      linkDirectionalArrowLength: { default: 0 },
      linkDirectionalArrowColor: {},
      linkDirectionalArrowRelPos: { default: 0.5 }, // value between 0<>1 indicating the relative pos along the (exposed) line
      linkDirectionalArrowResolution: { default: 8 }, // how many slice segments in the arrow's conic circumference
      linkDirectionalParticles: { default: 0 }, // animate photons travelling in the link direction
      linkDirectionalParticleSpeed: { default: 0.01 }, // in link length ratio per frame
      linkDirectionalParticleWidth: { default: 0.5 },
      linkDirectionalParticleColor: {},
      linkDirectionalParticleResolution: { default: 4 }, // how many slice segments in the particle sphere's circumference
      onNodeHover: {},
      onNodeClick: {},
      onLinkHover: {},
      onLinkClick: {},
      forceEngine: { default: 'd3' }, // d3 or ngraph
      d3AlphaMin: { default: 0 },
      d3AlphaDecay: { default: 0.0228 },
      d3VelocityDecay: { default: 0.4 },
      ngraphPhysics: {},
      warmupTicks: { default: 0 }, // how many times to tick the force engine at init before starting to render
      cooldownTicks: {},
      cooldownTime: { default: 15000 }, // ms
      onEngineTick: {},
      onEngineStop: {}
    },

    methods: {
      // pass-through methods
      ...Object.assign({}, ...[
        'getGraphBbox',
        'emitParticle',
        'd3Force',
        'd3ReheatSimulation',
        'refresh'
      ].map(method => ({
        [method]: function (state, ...args) {
          const aframeComp = state.forcegraph.components.forcegraph;
          const returnVal = aframeComp[method](...args);

          return returnVal === aframeComp
            ? this // chain based on this object, not the inner aframe component
            : returnVal;
        }
      }))),
      _destructor: function() {
        this.graphData({ nodes: [], links: [] });
      }
    },

    init(domNode, state, { markerAttrs = { preset: 'hiro' }} = {}) {
      // Wipe DOM
      domNode.innerHTML = '';

      state.container = document.createElement('div');
      domNode.appendChild(state.container);

      // Create scene
      const scene = document.createElement('a-scene');
      scene.setAttribute('embedded', '');
      scene.setAttribute('arjs', 'debugUIEnabled: false;');

      const arMarker = document.createElement('a-marker');
      // add marker attributes
      Object.entries(markerAttrs).forEach(([attr, val]) => arMarker.setAttribute(attr, val));
      scene.appendChild(arMarker);

      // Setup raycaster cursor
      let mouseCursor;
      scene.appendChild(mouseCursor = document.createElement('a-entity'));
      mouseCursor.setAttribute('cursor' /*, 'rayOrigin: mouse'*/); // mouse raycaster has accuracy issues in ar.js: https://github.com/AR-js-org/AR.js/issues/40
      mouseCursor.setAttribute('raycaster', 'objects: [forcegraph]');

      // Add forcegraph entity
      state.forcegraph = document.createElement('a-entity');
      state.forcegraph.setAttribute('forcegraph', null);
      arMarker.appendChild(state.forcegraph);

      const cameraEntity = document.createElement('a-entity');
      cameraEntity.setAttribute('camera', '');
      scene.appendChild(cameraEntity);

      // attach scene
      state.container.appendChild(scene);
      //domNode.appendChild(scene);
    },

    update(state, changedProps) {
      changedProps.hasOwnProperty('width') && state.width && (state.container.style.width = `${state.width}px`);
      changedProps.hasOwnProperty('height') && state.height && (state.container.style.height = `${state.height}px`);

      changedProps.hasOwnProperty('glScale') &&
        state.forcegraph.setAttribute('scale', [...new Array(3)].map(() => 1 / state.glScale).join(' '));

      changedProps.hasOwnProperty('yOffset') &&
      state.forcegraph.setAttribute('position', `0 ${state.yOffset} 0`);

      const passThroughProps = [
        'jsonUrl',
        'numDimensions',
        'dagMode',
        'dagLevelDistance',
        'dagNodeFilter',
        'onDagError',
        'nodeRelSize',
        'nodeId',
        'nodeVal',
        'nodeResolution',
        'nodeVisibility',
        'nodeColor',
        'nodeAutoColorBy',
        'nodeOpacity',
        'nodeThreeObject',
        'nodeThreeObjectExtend',
        'linkSource',
        'linkTarget',
        'linkVisibility',
        'linkColor',
        'linkAutoColorBy',
        'linkOpacity',
        'linkWidth',
        'linkResolution',
        'linkCurvature',
        'linkCurveRotation',
        'linkMaterial',
        'linkThreeObject',
        'linkThreeObjectExtend',
        'linkPositionUpdate',
        'linkDirectionalArrowLength',
        'linkDirectionalArrowColor',
        'linkDirectionalArrowRelPos',
        'linkDirectionalArrowResolution',
        'linkDirectionalParticles',
        'linkDirectionalParticleSpeed',
        'linkDirectionalParticleWidth',
        'linkDirectionalParticleColor',
        'linkDirectionalParticleResolution',
        'onNodeHover',
        'onNodeClick',
        'onLinkHover',
        'onLinkClick',
        'forceEngine',
        'd3AlphaMin',
        'd3AlphaDecay',
        'd3VelocityDecay',
        'ngraphPhysics',
        'warmupTicks',
        'cooldownTicks',
        'cooldownTime',
        'onEngineTick',
        'onEngineStop'
      ];

      const newProps = Object.assign({},
        ...Object.entries(state)
          .filter(([prop, val]) => changedProps.hasOwnProperty(prop) && passThroughProps.indexOf(prop) !== -1 && val !== undefined && val !== null)
          .map(([key, val]) => ({ [key]: val })),
        ...Object.entries(state.graphData)
          .map(([key, val]) => ({ [key]: val })) // pass nodes & links as separate props
      );

      state.forcegraph.setAttribute('forcegraph', newProps);
    }
  });
