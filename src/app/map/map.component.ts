import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CesiumService } from '../cesium.service';
import * as WKT  from 'terraformer-wkt-parser';
import * as toastr from 'ngx-toastr';
import { ToastrService } from 'ngx-toastr';
import Cartesian3 from 'cesium/Source/Core/Cartesian3';
import ScreenSpaceEventType from 'cesium/Source/Core/ScreenSpaceEventType';


declare var Cesium: any;


interface AutoPosting{
  id: number;
  analsPostingBuilds: string;
  analsPostingGroupId: string;
  analsPostingInfoName: string;
}

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
  /**
   * 자동 배치 결과 목록
   */
  autoPostingResults : AutoPosting[] = [];
  PRE:string = 'landscapeAxis-';

  constructor(private cesiumService: CesiumService, 
    private httpClient: HttpClient,
    private toastr: ToastrService) { }

  ngOnInit(): void {
    //viewer 초기화
    this.cesiumService.initViewer('contain');

    //
    this.toastr.info('초기화 완료');
  }


  /**
   * 이동
   */
  onFlyTo(lon:number, lat:number, alt:number) {
    //대한민국 전도
    this.cesiumService.flyTo(lon, lat, alt);

  }
  
  onGetAutoPostingResults(){
    //자동 배치 결과 조회
    this.httpClient.get<AutoPosting[]>('http://1.221.237.243:9091/svc/auto-posting-anals?analsPostingGroupId=134')
      .subscribe(data=>{
        this.autoPostingResults = data;
      });

    this.toastr.info('조회 완료');
  }


  extrudeBuildingByPolygon(polygon:any, entityName:string, height:number){
    let arr:number[] = [];

    let lon:number, lat:number;
    let maxLon:number = -999;
    let minLon:number = 999;
    let maxLat:number = -999;
    let minLat:number = 999;

    let pos: GeoJSON.Position[][][] = polygon.coordinates;
    
    pos.forEach(d=>{
      d.forEach(d2=>{
        // console.debug(d2[0], d2[1]);
        lon = ((d2[0] as unknown) as number);
        lat = ((d2[1] as unknown) as number);

        arr.push(lon);
        arr.push(lat);

        if(maxLon < lon){
          maxLon = lon;          
        }
        if(minLon > lon){
          minLon = lon;
        }
        if(maxLat < lat){
          maxLat = lat;
        }
        if(minLat > lat){
          minLat = lat;
        }
      });
    });

    this.cesiumService.polygon(arr, entityName, height);

    this.cesiumService.flyTo(minLon + ((maxLon-minLon)/2), minLat + ((maxLat-minLat)/2), 1000);
  }


  processAndShow(data:AutoPosting){
    let json = JSON.parse(data.analsPostingBuilds);

    Object.keys(json).forEach(k=>{
      let x = json[k];
      
      Object.keys(x.floor).forEach(k2=>{
        let x2 = x.floor[k2];
        
        Object.keys(x2.polygon).forEach(k3=>{
          let x3 = x2.polygon[k3];
          let polygon = WKT.parse(x3)
          // console.debug(x2);

          this.extrudeBuildingByPolygon(polygon, 'name', (x2.height * 3))
        });
      });
    });

  }


  OnShowAutoPosting(index:number, id:number){
    console.debug(index, id);

    let data = this.autoPostingResults[index];
    
    
    this.cesiumService.removeAllEntities();    
    this.processAndShow(data);
  }



  /**
   * 경관축 시작
   */
  startLandscapeAxis(){
    this.toastr.info('지도상에서 2점을 선택(클릭)하시기 바랍니다.');

    
    let pos:{
      start:Cartesian3|null,
      end:Cartesian3|null,
    } = {start:null, end:null};

    //
    this.endLandscapeAxis();

    //경관축 이벤트 시작
    this.cesiumService.startLandscapeAxisEvent((ctsn3:Cartesian3, type:ScreenSpaceEventType)=>{
      //왼쪽 클릭
      if(Cesium.ScreenSpaceEventType.LEFT_CLICK === type){
        //1st 위치
        if(!Cesium.defined(pos.start)){
          pos.start = ctsn3;
          this.cesiumService.showEllipsoid(`${this.PRE}-start`, pos.start);
          return;
        }

        //2nd 위치
        if(!Cesium.defined(pos.end)){
          pos.end = ctsn3;
          this.cesiumService.showEllipsoid(`${this.PRE}-end`, pos.end);
          this.cesiumService.removeEntityById(`${this.PRE}-line`);
          this.cesiumService.endLandscapeAxisEvent();
          this.cesiumService.direction(pos.start, pos.end);
        }
      }

      //이동
      if(Cesium.ScreenSpaceEventType.MOUSE_MOVE === type){
        this.cesiumService.showPolyline(`${this.PRE}-line`, pos.start, ctsn3);
      }


      //마우스 오른쪽 클릭
      if(Cesium.ScreenSpaceEventType.RIGHT_CLICK === type){
        this.endLandscapeAxis();
      }
    });
  }


  /**
   * 경관축 종료
   */
  endLandscapeAxis(){
    //이벤트 종료
    this.cesiumService.endLandscapeAxisEvent();
    //관련 엔티티 삭제
    this.cesiumService.removeEntityById(`${this.PRE}-start`);
    this.cesiumService.removeEntityById(`${this.PRE}-end`);
    this.cesiumService.removeEntityById(`${this.PRE}-line`);
  }

}
