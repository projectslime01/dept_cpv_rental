export interface GuideStep {
  title: string
  description: string
  imagePath: string
  imageAlt: string
}

export interface GuideSection {
  id: string
  title: string
  iconName: string
  steps: GuideStep[]
}

export const studentGuide: GuideSection[] = [
  {
    id: 'rental-rules',
    title: '신청 전 확인사항',
    iconName: 'AlertTriangle',
    steps: [
      {
        title: '기자재별 대여 수량 제한',
        description:
          '기자재마다 한 번에 신청할 수 있는 수량이 정해져 있습니다. 소니 FX3는 최대 2대까지, 렌즈는 종류별로 1개씩만 신청할 수 있습니다. 제한을 넘겨 신청하면 신청 단계에서 막히므로, 수량을 정하기 전에 확인해 주세요.',
        imagePath: '/guide/student/01-04-apply-form.png',
        imageAlt: '기자재 신청서의 수량 입력 화면',
      },
      {
        title: '팀 과제도 팀원 각자 신청',
        description:
          '팀 과제로 기자재를 사용하더라도 대표자 한 명이 팀 전체 몫을 몰아서 신청할 수 없습니다. 팀원 각자가 본인 이름과 학번으로 따로 신청해 주세요. 대여 이력과 반납 책임이 신청한 사람 개인에게 남습니다.',
        imagePath: '/guide/student/01-01-equipment-list.png',
        imageAlt: '기자재 목록 화면',
      },
    ],
  },
  {
    id: 'equipment-rental',
    title: '기자재 대여 신청',
    iconName: 'Package',
    steps: [
      {
        title: '기자재 목록 확인',
        description: '홈 화면에서 대여 가능한 기자재 목록을 확인합니다. 카테고리별로 필터링하거나 검색으로 원하는 기자재를 빠르게 찾을 수 있습니다.',
        imagePath: '/guide/student/01-01-equipment-list.png',
        imageAlt: '기자재 목록 화면',
      },
      {
        title: '기자재 상세 정보 확인',
        description: '기자재를 클릭하면 상세 정보와 대여 가능 수량, 부속 기자재 목록을 확인할 수 있습니다. 장바구니 담기 또는 바로 신청 버튼으로 신청을 시작합니다.',
        imagePath: '/guide/student/01-02-equipment-detail.png',
        imageAlt: '기자재 상세 페이지',
      },
      {
        title: '장바구니에 담기',
        description: '여러 기자재를 한 번에 신청하려면 장바구니에 담아두세요. 오른쪽 상단 장바구니 아이콘을 누르면 담긴 항목을 확인하고 한꺼번에 신청할 수 있습니다.',
        imagePath: '/guide/student/01-03-add-to-cart.png',
        imageAlt: '장바구니 화면',
      },
      {
        title: '신청서 작성',
        description:
          '이름, 학번, 연락처, 대여 기간, 사용 목적을 입력합니다. 수량은 기자재별 제한 안에서만 정할 수 있습니다(소니 FX3 최대 2대, 렌즈는 종류별 1개). 비밀번호는 나중에 신청 현황을 조회할 때 필요하므로 꼭 기억해두세요.',
        imagePath: '/guide/student/01-04-apply-form.png',
        imageAlt: '기자재 신청서 작성 화면',
      },
      {
        title: '신청 완료',
        description: '신청이 완료되면 신청번호가 발급됩니다. 신청번호를 메모해두면 언제든지 신청 현황 조회 메뉴에서 승인 여부를 확인할 수 있습니다.',
        imagePath: '/guide/student/01-05-apply-complete.png',
        imageAlt: '기자재 신청 완료 화면',
      },
    ],
  },
  {
    id: 'classroom-rental',
    title: '강의실 대여 신청',
    iconName: 'Building2',
    steps: [
      {
        title: '강의실 목록 확인',
        description: '상단 메뉴의 강의실 대여를 클릭하여 대여 가능한 강의실 목록을 확인합니다.',
        imagePath: '/guide/student/02-01-classroom-list.png',
        imageAlt: '강의실 목록 화면',
      },
      {
        title: '강의실 시간표 확인',
        description: '강의실을 클릭하면 현재 사용 중인 수업 시간표를 확인할 수 있습니다. 기존 수업 시간과 겹치지 않는 시간대를 선택해야 합니다.',
        imagePath: '/guide/student/02-02-classroom-detail.png',
        imageAlt: '강의실 상세 및 시간표 화면',
      },
      {
        title: '신청서 작성',
        description: '신청자 정보, 사용 날짜와 시간, 사용 목적, 단체 여부를 입력합니다. 단체 사용 시 인원수와 구성원 이름을 함께 입력해 주세요.',
        imagePath: '/guide/student/02-03-classroom-apply.png',
        imageAlt: '강의실 신청서 작성 화면',
      },
      {
        title: '신청 완료',
        description: '신청이 완료되면 신청번호가 발급됩니다. 관리자 승인 후 강의실을 이용하실 수 있으며, 신청 조회 메뉴에서 상태를 확인할 수 있습니다.',
        imagePath: '/guide/student/02-04-classroom-complete.png',
        imageAlt: '강의실 신청 완료 화면',
      },
    ],
  },
  {
    id: 'status-lookup',
    title: '신청 현황 조회',
    iconName: 'Search',
    steps: [
      {
        title: '신청 조회 페이지 접속',
        description: '상단 메뉴의 신청 조회를 클릭해 조회 페이지로 이동합니다. 기자재와 강의실 신청 내역 모두 이 페이지에서 확인할 수 있습니다.',
        imagePath: '/guide/student/03-01-status-page.png',
        imageAlt: '신청 조회 페이지',
      },
      {
        title: '신청번호와 비밀번호 입력',
        description: '신청 시 발급받은 신청번호와 본인이 설정한 비밀번호를 입력합니다. 두 정보가 일치해야 조회가 가능합니다.',
        imagePath: '/guide/student/03-02-status-input.png',
        imageAlt: '신청번호와 비밀번호 입력 화면',
      },
      {
        title: '신청 상태 확인',
        description: '현재 승인 상태(대기 중 / 승인됨 / 반려됨)와 대여 기간, 부속 기자재 내역을 확인할 수 있습니다. 반려된 경우 사유가 함께 표시됩니다.',
        imagePath: '/guide/student/03-03-status-result.png',
        imageAlt: '신청 상태 결과 화면',
      },
    ],
  },
  {
    id: 'rental-status',
    title: '전체 대여 현황',
    iconName: 'CalendarDays',
    steps: [
      {
        title: '전체 대여 현황 접속',
        description: '상단 메뉴의 전체 대여 현황을 클릭합니다. 학과 기자재 전체의 승인 완료된 대여 내역을 캘린더에서 한눈에 확인할 수 있습니다.',
        imagePath: '/guide/student/04-01-rental-status.png',
        imageAlt: '전체 대여 현황 페이지',
      },
      {
        title: '날짜별 예약 현황 확인',
        description: '캘린더에서 날짜를 선택하면 해당 날짜의 기자재별 대여 예약 현황을 확인할 수 있습니다. 원하는 날짜에 대여 가능 여부를 미리 파악해두세요.',
        imagePath: '/guide/student/04-02-rental-calendar.png',
        imageAlt: '캘린더 날짜별 현황 화면',
      },
    ],
  },
]

export const adminGuide: GuideSection[] = [
  {
    id: 'admin-dashboard',
    title: '대시보드',
    iconName: 'LayoutDashboard',
    steps: [
      {
        title: '통계 카드 확인',
        description: '대시보드 상단에 오늘의 신청 건수, 대기 중인 신청, 현재 대여 중인 기자재 수 등 핵심 통계를 확인할 수 있습니다.',
        imagePath: '/guide/admin/01-01-dashboard.png',
        imageAlt: '관리자 대시보드 통계 카드',
      },
      {
        title: '최근 신청 목록 확인',
        description: '대시보드 하단에 최근 접수된 신청 목록이 표시됩니다. 빠른 처리가 필요한 신청을 파악하고 해당 관리 페이지로 이동할 수 있습니다.',
        imagePath: '/guide/admin/01-02-dashboard-requests.png',
        imageAlt: '대시보드 최근 신청 목록',
      },
    ],
  },
  {
    id: 'admin-requests',
    title: '기자재 신청 관리',
    iconName: 'ClipboardList',
    steps: [
      {
        title: '신청 목록 조회',
        description: '접수된 기자재 대여 신청을 전체 조회합니다. 상태(대기 / 승인 / 반려)별로 필터링할 수 있습니다.',
        imagePath: '/guide/admin/02-01-requests-list.png',
        imageAlt: '기자재 신청 목록 화면',
      },
      {
        title: '신청 상세 확인',
        description: '신청 항목을 펼치면 신청자 정보, 대여 기간, 목적, 수량 등 상세 내용을 확인할 수 있습니다.',
        imagePath: '/guide/admin/02-02-requests-detail.png',
        imageAlt: '기자재 신청 상세 화면',
      },
      {
        title: '승인 처리',
        description: '내용을 검토한 뒤 승인 버튼을 클릭합니다. 재고 가용 수량이 자동으로 차감되며 신청자에게 승인 상태가 반영됩니다.',
        imagePath: '/guide/admin/02-03-requests-approve.png',
        imageAlt: '기자재 신청 승인 화면',
      },
      {
        title: '반려 처리',
        description: '반려 사유를 입력하고 반려 버튼을 클릭합니다. 반려된 신청은 재고에서 차감되지 않으며 사유가 신청자에게 표시됩니다.',
        imagePath: '/guide/admin/02-04-requests-reject.png',
        imageAlt: '기자재 신청 반려 화면',
      },
    ],
  },
  {
    id: 'admin-classroom-requests',
    title: '강의실 신청 관리',
    iconName: 'DoorOpen',
    steps: [
      {
        title: '강의실 신청 목록 조회',
        description: '접수된 강의실 대여 신청을 전체 조회합니다. 상태별로 필터링할 수 있으며 단체 신청은 별도로 표시됩니다.',
        imagePath: '/guide/admin/03-01-classroom-requests.png',
        imageAlt: '강의실 신청 목록 화면',
      },
      {
        title: '승인 / 반려 처리',
        description: '신청 내용과 시간표 충돌 여부를 확인한 후 승인 또는 반려 처리합니다. 충돌이 있는 경우 신청이 자동으로 차단되어 있습니다.',
        imagePath: '/guide/admin/03-02-classroom-approve.png',
        imageAlt: '강의실 신청 승인 반려 화면',
      },
    ],
  },
  {
    id: 'admin-equipment',
    title: '기자재 관리',
    iconName: 'Package',
    steps: [
      {
        title: '기자재 목록 확인',
        description: '등록된 기자재와 수량, 현재 상태를 확인합니다. 비활성화된 기자재는 학생 화면에서 숨겨집니다.',
        imagePath: '/guide/admin/04-01-equipment-list.png',
        imageAlt: '관리자 기자재 목록 화면',
      },
      {
        title: '기자재 등록',
        description: '기자재 추가 버튼으로 새 기자재를 등록합니다. 이름, 카테고리, 총 수량, 최소/최대 대여 수량을 입력합니다.',
        imagePath: '/guide/admin/04-02-equipment-add.png',
        imageAlt: '기자재 등록 화면',
      },
      {
        title: '기자재 수정 / 비활성화',
        description: '기존 기자재 정보를 수정하거나 일시적으로 비활성화하여 신청을 차단할 수 있습니다.',
        imagePath: '/guide/admin/04-03-equipment-edit.png',
        imageAlt: '기자재 수정 화면',
      },
      {
        title: '부속 기자재 관리',
        description: '기자재 항목의 부속 관리를 클릭하여 함께 대여되는 부속 기자재(케이블, 어댑터 등)를 등록하고 수량을 관리합니다.',
        imagePath: '/guide/admin/04-04-equipment-accessory.png',
        imageAlt: '부속 기자재 관리 화면',
      },
    ],
  },
  {
    id: 'admin-classrooms',
    title: '강의실 관리',
    iconName: 'Building2',
    steps: [
      {
        title: '강의실 목록 확인',
        description: '등록된 강의실 목록과 현재 상태를 확인합니다. 비활성화된 강의실은 학생 화면에서 숨겨집니다.',
        imagePath: '/guide/admin/05-01-classrooms-list.png',
        imageAlt: '관리자 강의실 목록 화면',
      },
      {
        title: '강의실 등록',
        description: '강의실 추가 버튼으로 새 강의실을 등록합니다. 호수(예: A101)와 초기 상태를 입력합니다.',
        imagePath: '/guide/admin/05-02-classrooms-add.png',
        imageAlt: '강의실 등록 화면',
      },
      {
        title: '시간표 설정',
        description: '강의실별 시간표 관리에서 수업 시간을 등록합니다. 요일, 시작/종료 시간, 과목명, 학기 기간을 입력하면 해당 시간대에는 신청이 자동으로 차단됩니다.',
        imagePath: '/guide/admin/05-03-classrooms-timetable.png',
        imageAlt: '강의실 시간표 설정 화면',
      },
    ],
  },
  {
    id: 'admin-history',
    title: '대여 이력',
    iconName: 'History',
    steps: [
      {
        title: '이력 목록 조회',
        description: '과거 대여 완료 및 처리된 기록을 전체 조회합니다. 기자재별, 강의실별 이력을 모두 확인할 수 있습니다.',
        imagePath: '/guide/admin/06-01-history-list.png',
        imageAlt: '대여 이력 목록 화면',
      },
      {
        title: '날짜 / 기자재 필터',
        description: '날짜 범위나 기자재를 선택해 특정 기간의 이력을 필터링합니다. 검색 결과를 통해 대여 패턴을 파악할 수 있습니다.',
        imagePath: '/guide/admin/06-02-history-filter.png',
        imageAlt: '대여 이력 필터 화면',
      },
    ],
  },
  {
    id: 'admin-test-request',
    title: '테스트 신청',
    iconName: 'TestTube2',
    steps: [
      {
        title: '테스트 신청 페이지 접속',
        description: '좌측 메뉴의 테스트 신청을 클릭합니다. 평일 업무시간 외에도 시스템 테스트 목적으로 대여 신청을 자유롭게 생성할 수 있습니다.',
        imagePath: '/guide/admin/07-01-test-request.png',
        imageAlt: '테스트 신청 페이지',
      },
      {
        title: '기자재 테스트 신청 생성',
        description: '기자재 탭에서 기자재, 날짜, 신청자 정보를 입력하고 신청을 생성합니다. 시간 제한 없이 임의 날짜로 테스트 신청을 만들 수 있습니다.',
        imagePath: '/guide/admin/07-02-test-equipment.png',
        imageAlt: '기자재 테스트 신청 생성 화면',
      },
      {
        title: '강의실 테스트 신청 생성',
        description: '강의실 탭에서 강의실과 사용 시간을 입력하고 신청을 생성합니다. 생성된 테스트 신청은 일반 신청 목록에 테스트 배지로 구분되어 표시됩니다.',
        imagePath: '/guide/admin/07-03-test-classroom.png',
        imageAlt: '강의실 테스트 신청 생성 화면',
      },
    ],
  },
]
