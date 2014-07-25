//
// Autogenerated by Thrift Compiler (0.9.1)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//


StatusT = {
'StatusOk' : 0,
'StatusPerm' : 1,
'StatusNoEnt' : 2,
'StatusSrch' : 3,
'StatusIntr' : 4,
'StatusIO' : 5,
'StatusNxIO' : 6,
'Status2Big' : 7,
'StatusNoExec' : 8,
'StatusBadF' : 9,
'StatusChild' : 10,
'StatusAgain' : 11,
'StatusNoMem' : 12,
'StatusAccess' : 13,
'StatusFault' : 14,
'StatusNotBlk' : 15,
'StatusBusy' : 16,
'StatusExist' : 17,
'StatusXDev' : 18,
'StatusNoDev' : 19,
'StatusNotDir' : 20,
'StatusIsDir' : 21,
'StatusInval' : 22,
'StatusNFile' : 23,
'StatusMFile' : 24,
'StatusNoTTY' : 25,
'StatusTxtBsy' : 26,
'StatusFBig' : 27,
'StatusNoSpc' : 28,
'StatusSPipe' : 29,
'StatusROFS' : 30,
'StatusMLink' : 31,
'StatusPipe' : 32,
'StatusDom' : 33,
'StatusRange' : 34,
'StatusDeadLk' : 35,
'StatusNameTooLong' : 36,
'StatusNoLck' : 37,
'StatusNoSys' : 38,
'StatusNotEmpty' : 39,
'StatusLoop' : 40,
'StatusNoMsg' : 41,
'StatusIdRm' : 42,
'StatusChRng' : 43,
'StatusL2NSync' : 44,
'StatusL3Hlt' : 45,
'StatusL3Rst' : 46,
'StatusLNRng' : 47,
'StatusUnatch' : 48,
'StatusNoCSI' : 49,
'StatusL2Hlt' : 50,
'StatusBadE' : 51,
'StatusBadR' : 52,
'StatusXFull' : 53,
'StatusNoAno' : 54,
'StatusBadRqC' : 55,
'StatusBadSlt' : 56,
'StatusBFont' : 57,
'StatusNoStr' : 58,
'StatusNoData' : 59,
'StatusTime' : 60,
'StatusNoSR' : 61,
'StatusNoNet' : 62,
'StatusNoPkg' : 63,
'StatusRemote' : 64,
'StatusNoLink' : 65,
'StatusAdv' : 66,
'StatusSRMnt' : 67,
'StatusComm' : 68,
'StatusProto' : 69,
'StatusMultihop' : 70,
'StatusDotDot' : 71,
'StatusBadMsg' : 72,
'StatusOverflow' : 73,
'StatusNotUniq' : 74,
'StatusBadFD' : 75,
'StatusRemChg' : 76,
'StatusLibAcc' : 77,
'StatusLibBad' : 78,
'StatusLibScn' : 79,
'StatusLibMax' : 80,
'StatusLibExec' : 81,
'StatusIlSeq' : 82,
'StatusRestart' : 83,
'StatusStrPipe' : 84,
'StatusUsers' : 85,
'StatusNotSock' : 86,
'StatusDestAddrReq' : 87,
'StatusMsgSize' : 88,
'StatusPrototype' : 89,
'StatusNoProtoOpt' : 90,
'StatusProtoNoSupport' : 91,
'StatusSockTNoSupport' : 92,
'StatusOpNotSupp' : 93,
'StatusPFNoSupport' : 94,
'StatusAFNoSupport' : 95,
'StatusAddrInUse' : 96,
'StatusAddrNotAvail' : 97,
'StatusNetDown' : 98,
'StatusNetUnreach' : 99,
'StatusNetReset' : 100,
'StatusConnAborted' : 101,
'StatusConnReset' : 102,
'StatusNoBufs' : 103,
'StatusIsConn' : 104,
'StatusNotConn' : 105,
'StatusShutdown' : 106,
'StatusTooManyRefs' : 107,
'StatusTimedOut' : 108,
'StatusConnRefused' : 109,
'StatusHostDown' : 110,
'StatusHostUnreach' : 111,
'StatusAlready' : 112,
'StatusInProgress' : 113,
'StatusStale' : 114,
'StatusUClean' : 115,
'StatusNotNam' : 116,
'StatusNAvail' : 117,
'StatusIsNam' : 118,
'StatusRemoteIo' : 119,
'StatusDQuot' : 120,
'StatusNoMedium' : 121,
'StatusMediumType' : 122,
'StatusCanceled' : 123,
'StatusNoKey' : 124,
'StatusKeyExpired' : 125,
'StatusKeyRevoked' : 126,
'StatusKeyRejected' : 127,
'StatusOwnerDead' : 128,
'StatusNotRecoverable' : 129,
'StatusRFKill' : 130,
'StatusHwPoison' : 131,
'StatusTrunc' : 132,
'StatusUnimpl' : 133,
'StatusUnknown' : 134,
'StatusMsgLibDeleteFailed' : 135,
'StatusThrCreateFailed' : 136,
'StatusConfigLibDevOpenFailed' : 137,
'StatusConfigLibDevLSeekFailed' : 138,
'StatusConfigLibFlashDevOpenFailed' : 139,
'StatusConfigLibFlashDevLSeekFailed' : 140,
'StatusConfigLibDeleteFailed' : 141,
'StatusUsrNodeIncorrectParams' : 142,
'StatusUnicodeUnsupported' : 143,
'StatusEAIBadFlags' : 144,
'StatusEAINoName' : 145,
'StatusEAIFail' : 146,
'StatusEAIService' : 147,
'StatusEAINoData' : 148,
'StatusEAIAddrFamily' : 149,
'StatusEAINotCancel' : 150,
'StatusEAIAllDone' : 151,
'StatusEAIIDNEncode' : 152,
'StatusLast' : 153,
'StatusMore' : 154,
'StatusCliUnknownCmd' : 155,
'StatusCliParseError' : 156,
'StatusNsSuccess' : 157,
'StatusNsFail' : 158,
'StatusNsAnotherIoInProgress' : 159,
'StatusNsOiosExceeded' : 160,
'StatusNsIoNotFound' : 161,
'StatusNsOutOfMsgs' : 162,
'StatusNsMsgFailed' : 163,
'StatusMsgSuccess' : 164,
'StatusMsgFail' : 165,
'StatusMsgOutOfMessages' : 166,
'StatusMsgShutdown' : 167,
'StatusNoSuchNode' : 168,
'StatusNewTableCreated' : 169,
'StatusNoSuchTable' : 170,
'StatusNoSuchResultSet' : 171,
'StatusDfAppendUnsupported' : 172,
'StatusDfRemoveUnsupported' : 173,
'StatusDfParseError' : 174,
'StatusDfRecordCorrupt' : 175,
'StatusDfFieldNoExist' : 176,
'StatusDfUnknownFieldType' : 177,
'StatusDfRowNotFound' : 178,
'StatusDfValNotFound' : 179,
'StatusDsTooManyKeyValues' : 180,
'StatusTableAlreadyExists' : 181,
'StatusCliUnclosedQuotes' : 182,
'StatusRangePartError' : 183,
'StatusNewFieldNameIsBlank' : 184,
'StatusNoDataDictForFormatType' : 185,
'StatusBTreeNotFound' : 186,
'StatusCmdNotComplete' : 187,
'StatusInvalidResultSetId' : 188,
'StatusPositionExceedResultSetSize' : 189
};
StatusTStr = {0 : 'Success',
1 : 'Operation not permitted',
2 : 'No such file or directory',
3 : 'No such process',
4 : 'Interrupted system call',
5 : 'I/O error',
6 : 'No such device or address',
7 : 'Argument list too long',
8 : 'Exec format error',
9 : 'Bad file number',
10 : 'No child processes',
11 : 'Try again',
12 : 'Out of memory',
13 : 'Permission denied',
14 : 'Bad address',
15 : 'Block device required',
16 : 'Device or resource busy',
17 : 'File exists',
18 : 'Cross-device link',
19 : 'No such device',
20 : 'Not a directory',
21 : 'Is a directory',
22 : 'Invalid argument',
23 : 'File table overflow',
24 : 'Too many open files',
25 : 'Not a typewriter',
26 : 'Text file busy',
27 : 'File too large',
28 : 'No space left on device',
29 : 'Illegal seek',
30 : 'Read-only file system',
31 : 'Too many links',
32 : 'Broken pipe',
33 : 'Math argument out of domain of func',
34 : 'Math result not representable',
35 : 'Resource deadlock would occur',
36 : 'File name too long',
37 : 'No record locks available',
38 : 'Function not implemented',
39 : 'Directory not empty',
40 : 'Too many symbolic links encountered',
41 : 'No message of desired type',
42 : 'Identifier removed',
43 : 'Channel number out of range',
44 : 'Level 2 not synchronized',
45 : 'Level 3 halted',
46 : 'Level 3 reset',
47 : 'Link number out of range',
48 : 'Protocol driver not attached',
49 : 'No CSI structure available',
50 : 'Level 2 halted',
51 : 'Invalid exchange',
52 : 'Invalid request descriptor',
53 : 'Exchange full',
54 : 'No anode',
55 : 'Invalid request code',
56 : 'Invalid slot',
57 : 'Bad font file format',
58 : 'Device not a stream',
59 : 'No data available',
60 : 'Timer expired',
61 : 'Out of streams resources',
62 : 'Machine is not on the network',
63 : 'Package not installed',
64 : 'Object is remote',
65 : 'Link has been severed',
66 : 'Advertise error',
67 : 'Srmount error',
68 : 'Communication error on send',
69 : 'Protocol error',
70 : 'Multihop attempted',
71 : 'RFS specific error',
72 : 'Not a data message',
73 : 'Value too large for defined data type',
74 : 'Name not unique on network',
75 : 'File descriptor in bad state',
76 : 'Remote address changed',
77 : 'Can not access a needed shared library',
78 : 'Accessing a corrupted shared library',
79 : '.lib section in a.out corrupted',
80 : 'Attempting to link in too many shared libraries',
81 : 'Cannot exec a shared library directly',
82 : 'Illegal byte sequence',
83 : 'Interrupted system call should be restarted',
84 : 'Streams pipe error',
85 : 'Too many users',
86 : 'Socket operation on non-socket',
87 : 'Destination address required',
88 : 'Message too long',
89 : 'Protocol wrong type for socket',
90 : 'Protocol not available',
91 : 'Protocol not supported',
92 : 'Socket type not supported',
93 : 'Operation not supported on transport endpoint',
94 : 'Protocol family not supported',
95 : 'Address family not supported by protocol',
96 : 'Address already in use',
97 : 'Cannot assign requested address',
98 : 'Network is down',
99 : 'Network is unreachable',
100 : 'Network dropped connection because of reset',
101 : 'Software caused connection abort',
102 : 'Connection reset by peer',
103 : 'No buffer space available',
104 : 'Transport endpoint is already connected',
105 : 'Transport endpoint is not connected',
106 : 'Cannot send after transport endpoint shutdown',
107 : 'Too many references: cannot splice',
108 : 'Connection timed out',
109 : 'Connection refused',
110 : 'Host is down',
111 : 'No route to host',
112 : 'Operation already in progress',
113 : 'Operation now in progress',
114 : 'Stale NFS file handle',
115 : 'Structure needs cleaning',
116 : 'Not a XENIX named type file',
117 : 'No XENIX semaphores available',
118 : 'Is a named type file',
119 : 'Remote I/O error',
120 : 'Quota exceeded',
121 : 'No medium found',
122 : 'Wrong medium type',
123 : 'Operation Canceled',
124 : 'Required key not available',
125 : 'Key has expired',
126 : 'Key has been revoked',
127 : 'Key was rejected by service',
128 : 'Owner died',
129 : 'State not recoverable',
130 : 'Operation not possible due to RF-kill',
131 : 'Memory page has hardware error',
132 : 'Output truncated',
133 : 'Not implemented',
134 : 'Unknown error',
135 : 'msgLib delete() failed',
136 : 'thrCreate() failed',
137 : 'libConfig open() failed',
138 : 'libConfig lseek() failed',
139 : 'libConfig flash open() failed',
140 : 'libConfig flash lseek() failed',
141 : 'libConfig configDelete() failed',
142 : 'Incorrect params to UsrNodeMain',
143 : 'Unicode strings are not supported by this function',
144 : 'Invalid value for ai_flags field',
145 : 'NAME or SERVICE is unknown',
146 : 'Non-recoverable failure in name resolution',
147 : 'SERVICE not supported for socket type',
148 : 'No address associated with NAME',
149 : 'Address family for NAME not supported',
150 : 'Request not canceled',
151 : 'All requests done',
152 : 'IDN encoding failed',
153 : 'Last page',
154 : 'More data to follow. Not end of stream',
155 : 'Bad command or file name',
156 : 'Error parsing command',
157 : 'Success',
158 : 'Fail',
159 : 'Another IO in progress',
160 : 'Oios Exceeded',
161 : 'IO not found',
162 : 'Out of messages',
163 : 'Failure in message layer',
164 : 'Message success',
165 : 'Failure in the message layer',
166 : 'Out of messages',
167 : 'Shutdown message',
168 : 'No such node exists in cluster',
169 : 'New table created',
170 : 'No such table',
171 : 'No such result set',
172 : 'Data format does not support appending fields',
173 : 'Data format does not support removing fields',
174 : 'Failed to parse data format value',
175 : 'Record data format is corrupt',
176 : 'Field does not exist within record',
177 : 'Unknown field type',
178 : 'Failed to find a row corresponding to the given key',
179 : 'Searched value was not found',
180 : 'Intended key has more than a single',
181 : 'Table already exists',
182 : 'Invalid command. Could not find matching quotes',
183 : 'Failed to compute the range partition hash function',
184 : 'Field name cannot be blank',
185 : 'No data dictionary defined for format type',
186 : 'Could not find BTree associated with table handle',
187 : 'Command is still running',
188 : 'Invalid result set ID',
189 : 'Cannot set position to beyond result set size'
};
