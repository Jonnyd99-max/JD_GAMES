import type {Metadata} from'next';import'./globals.css';
export const metadata:Metadata={title:'JD Games — Pick a game. Beat your best.',description:'Play JD Games Drag Racer, an original quarter-mile browser racing game.',manifest:'./manifest.webmanifest'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
