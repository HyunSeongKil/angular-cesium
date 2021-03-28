import { Injectable } from '@angular/core';
import { Viewer } from 'cesium';
import Cartesian2 from 'cesium/Source/Core/Cartesian2';
import Cartesian3 from 'cesium/Source/Core/Cartesian3';
import Cartographic from 'cesium/Source/Core/Cartographic';
import Entity from 'cesium/Source/DataSources/Entity';
import HeightReference from 'cesium/Source/Scene/HeightReference';

declare var Cesium: any;


interface ICesiumService {
    initViewer(container: string): Viewer;

    flyTo(lon: number, lat: number, alt: number): void;
    // flyTo(ctsn3:Cartesian3):void;
}

interface LonLatAlt{
    lon: number;
    lat: number;
    alt?: number;
}


@Injectable({
    providedIn: 'root'
})
export class CesiumService implements ICesiumService {

    _viewer: any;
    _eventHandler: any;

    constructor() { }


    /**
     * 방향성 계산
     * @param startCtsn3 시작 위치
     * @param endCtsn3 종료 위치
     * @returns 방향성
     */
    static getDirection(startCtsn3:Cartesian3|null, endCtsn3:Cartesian3|null):Cartesian3{
        let direction = Cesium.Cartesian3.subtract(endCtsn3, startCtsn3, new Cesium.Cartesian3());
        Cesium.Cartesian3.normalize(direction, direction);

        return direction;
    }



    /**
     * cartesian3를 lonLatAlt로 변환
     * @param ctsn3 
     * @returns 
     */
    static fromCtsn3ToLonLatAlt(ctsn3:Cartesian3|null):LonLatAlt|null{
        if(!Cesium.defined(ctsn3)){
            return null;
        }

        let carto:Cartographic = Cesium.Cartographic.fromCartesian(ctsn3);
        let lonLat:LonLatAlt = {
            lon: Cesium.Math.toDegrees(carto.longitude),
            lat: Cesium.Math.toDegrees(carto.latitude),
            alt: carto.height
        }

        return lonLat;
    }


    /**
     * cartesian2를 cartesian3로 변환
     * @param viewer 
     * @param ctsn2 
     * @returns 
     */
    static fromCtsn2ToCtsn3(viewer:Viewer, ctsn2:Cartesian2):Cartesian3{
        return viewer.scene.pickPosition(ctsn2);
    }

    /**
     * 
     * @param container 
     */
    initViewer(container: string): Viewer {
        let viewer: Viewer = new Cesium.Viewer(container, {
            contextOptions: {
                webgl: {
                    alpha: true,
                    depth: false,
                    stencil: true,
                    antialias: true,
                    premultipliedAlpha: true,
                    preserveDrawingBuffer: true,
                    failIfMajorPerformanceCaveat: true
                },
                allowTextureFilterAnisotropic: true
            },
            animation: false, // Whether to display animation controls
            shouldAnimate: true,
            homeButton: false, // Whether to display the Home button
            fullscreenButton: false, // Whether to display the full screen button
            baseLayerPicker: false, // Whether to display the layer selection control
            geocoder: false, // Whether to display the place name search control
            timeline: false, // Whether to display the timeline control
            sceneModePicker: false, // Whether to display the projection mode control
            navigationHelpButton: false, // Whether to display the help information control
            infoBox: false, // Whether to display the information displayed after clicking the element
            requestRenderMode: true, // enable request rendering mode
            scene3DOnly: false, // Each geometry instance will only be rendered in 3D to save GPU memory
            sceneMode: 3, // Initial scene mode 1 2D mode 2 2D loop mode 3 3D mode Cesium.SceneMode
            fullscreenElement: document.body, // HTML elements rendered in full screen are temporarily useless
            selectionIndicator: false,
            imageryProvider: new Cesium.WebMapTileServiceImageryProvider({
                // tslint:disable-next-line: max-line-length
                url: 'http://t0.tianditu.gov.cn/img_w/wmts?service=WMTS&version=1.0.0&request=GetTile&tilematrixset=w&tk=4d0a3b94af2cf3fd83f5dfb34c81d1f7',
                layer: 'img',
                style: 'default',
                format: 'image/jpeg',
                tileMatrixSetID: 'w',
                credit: new Cesium.Credit('Sky Map Global Image Service'),
                show: false,
                maximumLevel: 18
            })
        });
        // viewer.cesiumWidget.creditContainer.style.display = 'none';

        this._viewer = viewer;
        this._viewer.scene.globe.depthTestAgainstTerrain = true;

        return this._viewer;
    }



    /**
     * flyto
     * @param lon 
     * @param lat 
     * @param alt 
     */
    flyTo(lon: number, lat: number, alt: number): void {
        this._viewer.scene.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt)
        })
    }


    /**
     * 모든 엔티티 삭제
     */
    removeAllEntities() {
        this._viewer.entities.removeAll();
    }



    /**
     * 
     * @param lonLats 
     * @param entityName 
     * @param height 
     */
    polygon(lonLats: number[], entityName: string, height: number) {
        // console.debug(arr, entityName, height);


        this._viewer.entities.add({
            name: entityName,
            polygon: {
                hierarchy: new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(lonLats)),
                extrudedHeight: height,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                outline: true,
                outlineColor: Cesium.Color.DARKGRAY,
                material: Cesium.Color.GRAY,
            }
        });
    }



    /**
     * 경관축 관련 마우스 이벤트 등록. 이벤트 발생시 콜백함수 호출
     * @param callbackFn 콜백함수
     */
    startLandscapeAxisEvent(callbackFn:Function) {
        if (undefined === this._eventHandler) {
            this._eventHandler = new Cesium.ScreenSpaceEventHandler(this._viewer.canvas);
        }

        let self = this;


        //마우스 왼쪽
        this._eventHandler.setInputAction((windowPosition: any) => {
            if(!self._viewer.scene.pickPositionSupported){
                console.warn('pickposition not supported');
                return;
            }

            if(!Cesium.defined(windowPosition)){
                return;
            }

            let ctsn3:Cartesian3 = CesiumService.fromCtsn2ToCtsn3(self._viewer, windowPosition.position);

            callbackFn(ctsn3, Cesium.ScreenSpaceEventType.LEFT_CLICK);
            // console.debug(ctsn3, lonLat);

            
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);


        //마우스 오른쪽
        this._eventHandler.setInputAction((windowPosition: any) => {
            if(!self._viewer.scene.pickPositionSupported){
                console.warn('pickposition not supported');
                return;
            }

            if(!Cesium.defined(windowPosition)){
                return;
            }

            let ctsn3:Cartesian3 = CesiumService.fromCtsn2ToCtsn3(self._viewer, windowPosition.position);

            callbackFn(ctsn3, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

        //이동
        this._eventHandler.setInputAction((windowPosition:any)=>{
            if(!self._viewer.scene.pickPositionSupported){
                console.warn('pickposition not supported');
                return;
            }

            if(!Cesium.defined(windowPosition) || !Cesium.defined(windowPosition.endPosition)){
                return;
            }

            let ctsn3:Cartesian3 = CesiumService.fromCtsn2ToCtsn3(self._viewer, windowPosition.endPosition);

            callbackFn(ctsn3, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    }


    /**
     * 경관축 관련 마우스 이벤트 제거
     * @returns 
     */
    endLandscapeAxisEvent():void {
        if(!Cesium.defined(this._eventHandler)){
            return;
        }


        this._eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
        this._eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
        this._eventHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    }


    /**
     * ellipsoid 엔티티 생성
     * @param id 엔티티 아이디
     * @param ctsn3 위치
     */
    showEllipsoid(id:string, ctsn3:Cartesian3){
        this._viewer.entities.removeById(id);


        this._viewer.entities.add({
            id: id,
            name: id,
            position: ctsn3,
            ellipsoid: {
                radii: new Cesium.Cartesian3(0.5, 0.5, 0.5),
                heightReference : HeightReference.RELATIVE_TO_GROUND
            }
        });
    }


    /**
     * polyline 엔티티 생성
     * @param id 엔티티 아이디
     * @param startCtsn3 시작 위치
     * @param endCtsn3 종료 위치
     * @returns 
     */
    showPolyline(id:string, startCtsn3:Cartesian3|null, endCtsn3:Cartesian3|null){
        if(!Cesium.defined(startCtsn3)){
            return;
        }

        this._viewer.entities.removeById(id);


        this._viewer.entities.add({
            id: id,
            name: id,
            polyline: {
                // This callback updates positions each frame.
                positions: new Cesium.CallbackProperty(function () {
                    return [startCtsn3, endCtsn3]
                }, false),
                // positions: [startCtsn3, endCtsn3],
                width: 10,
                clampToGround: false,
                material: new Cesium.PolylineOutlineMaterialProperty({
                    color: Cesium.Color.YELLOW,
                })
            },
        });
    }


    /**
     * id로 엔티티 삭제
     * @param id 엔티티 아이디
     */
    removeEntityById(id:string){
        this._viewer.entities.removeById(id);
    }


    /**
     * 시작위치 => 종료위치 카메카 각도 변경
     * @param startCtsn3 시작 위치
     * @param endCtsn3 종료 위치
     */
    direction(startCtsn3:Cartesian3|null, endCtsn3:Cartesian3|null){
        let self = this;

        self._viewer.scene.camera.flyTo({
            destination: startCtsn3,
            orientation: {
                direction: CesiumService.getDirection(startCtsn3, endCtsn3),
                up : new Cesium.Cartesian3()
            },
            duration: 1,
        })

        self._viewer.camera.setView({
            destination: endCtsn3,
            orientation: {
                heading: self._viewer.camera.heading,
                pitch: self._viewer.camera.pitch,
                roll: self._viewer.camera.roll,
            }
        });

    }
}
