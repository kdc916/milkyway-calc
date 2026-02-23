# 🌌 은하수 관측 확률 계산기 Pro Max (Global Edition)
**Milky Way Observation Probability Calculator**

전 세계 어디서든 완벽한 은하수 관측 타이밍을 찾아주는 웹 애플리케이션입니다. 단일 HTML 파일로 구성되어 있으며 날씨, 달빛, 광해, 그리고 은하수 중심(Galactic Core)의 고도를 종합적으로 분석하여 가장 완벽한 관측 시간(Golden Window)을 추천해 줍니다.

## ✨ 주요 기능 (Key Features)

* **🌍 전 세계 장소 검색 & 현위치 추적**: OpenStreetMap API를 통해 전 세계 주요 관측지를 검색하고, Geolocation API로 현재 내 위치의 조건을 즉시 확인합니다.
* **🌤️ 정밀 기상 데이터 분석**: Open-Meteo API를 활용하여 지정된 날짜(최대 14일)의 상/중/하층운 구름량, 기온, 이슬점(결로 예측), 풍속을 종합 평가합니다.
* **🌙 천문 데이터 및 위상 계산**: SunCalc 라이브러리를 통해 달의 위상(이모지 시각화), 달의 고도, 그리고 은하수 코어의 방위각과 고도를 계산하여 달빛 간섭을 딥하게 판독합니다.
* **💡 방향성 광해 분석 & 오버레이**: 단순 광해 지도 제공을 넘어, 관측하고자 하는 코어 방향에 거대 도심 광해(예: 서울빛그물)가 겹치는지 계산합니다.
* **📊 시각화된 GO/NO-GO 타임라인**: 18시부터 다음날 아침까지 15분 단위의 관측 적합도를 바(Bar) 형태로 시각화하여 최적의 촬영 타임을 한눈에 보여줍니다.
* **⭐ 나만의 비밀 장소 저장**: 브라우저 Local Storage를 활용해 나만의 은하수 스팟을 즐겨찾기에 저장하고 언제든 꺼내볼 수 있습니다.
* **📸 캡처 & 공유 기능**: 계산된 결과 팝업을 고화질 이미지로 캡처하여 동행할 지인들에게 즉시 공유할 수 있습니다.

## 🛠️ 기술 스택 (Tech Stack)
* **Frontend:** HTML5, CSS3, Vanilla JavaScript
* **Map Engine:** Leaflet.js (OpenStreetMap, CARTO Dark Matter, Esri World Imagery)
* **Astronomy:** SunCalc.js
* **APIs:** Open-Meteo API (Weather), Nominatim API (Geocoding)
* **Tools:** html2canvas (Image Capture)

## 🚀 사용 방법 (How to Use)
별도의 설치나 빌드 과정이 필요 없습니다.
1. 이 저장소를 Clone 하거나 다운로드합니다.
2. `index.html` 파일을 최신 웹 브라우저(Chrome, Safari, Edge 등)에서 열기만 하면 즉시 작동합니다.
3. (선택 사항) GitHub Pages, Vercel 등을 통해 정적 웹사이트로 무료 배포하여 스마트폰 환경에서 쉽게 접속할 수도 있습니다.

## 📱 스크린샷 (Screenshots)
*(여기에 실제 작동하는 웹 화면 캡처 이미지를 추가해 주세요!)*

## 🤝 기여 (Contributing)
은하수 관측을 사랑하는 분들의 버그 리포트, 기능 제안, PR(Pull Request)을 언제나 환영합니다!





# 🌌 Milky Way Observation Probability Calculator Pro Max (Global Edition)

A comprehensive web application designed to help you find the perfect timing to observe and photograph the Milky Way from anywhere in the world. Built entirely in a single HTML file, it comprehensively analyzes weather conditions, moonlight, light pollution, and the altitude of the Galactic Core to recommend the ultimate "Golden Window" for your astrophotography.

## ✨ Key Features

* **🌍 Global Location Search & Live Tracking**: Search for observation spots worldwide using the OpenStreetMap API, and instantly check conditions at your current location via the Geolocation API.
* **🌤️ Precise Weather Data Analysis**: Utilizes the Open-Meteo API to evaluate cloud cover (low/mid/high), temperature, dew point (condensation prediction), and wind speed for up to 14 days in advance.
* **🌙 Astronomical Data & Moon Phase**: Powered by SunCalc to calculate moon phases (visualized with emojis), moon altitude, and the Galactic Core's azimuth and altitude to deeply analyze moonlight interference.
* **💡 Directional Light Pollution Analysis**: Goes beyond standard light pollution maps by calculating whether massive city light domes interfere with your specific line of sight to the Galactic Core.
* **📊 Visualized GO/NO-GO Timeline**: Displays a 15-minute interval bar chart from 18:00 to the next morning, allowing you to gauge the optimal shooting time at a glance.
* **⭐ Save Your Secret Spots**: Uses browser Local Storage so you can bookmark your favorite Milky Way spots and access them anytime without a database.
* **📸 Capture & Share**: Capture the calculated result popup as a high-resolution image to easily share with your astrophotography buddies.

## 🛠️ Tech Stack
* **Frontend:** HTML5, CSS3, Vanilla JavaScript
* **Map Engine:** Leaflet.js (OpenStreetMap, CARTO Dark Matter, Esri World Imagery)
* **Astronomy:** SunCalc.js
* **APIs:** Open-Meteo API (Weather Forecast), Nominatim API (Geocoding)
* **Tools:** html2canvas (Image Capture)

## 🚀 How to Use
No installation or build process is required!
1. Clone or download this repository.
2. Simply open the `index.html` file in any modern web browser (Chrome, Safari, Edge, etc.) and it will work right out of the box.
3. *(Optional)* You can easily deploy it for free as a static website via GitHub Pages or Vercel for convenient mobile access.

## 📱 Screenshots
*(Please add screenshots of your actual web app running here!)*

## 🤝 Contributing
Bug reports, feature requests, and Pull Requests (PRs) from fellow astrophotography enthusiasts are always welcome! Let's chase the stars together. 🌌
